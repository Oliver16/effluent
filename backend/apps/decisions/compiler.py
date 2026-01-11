"""
Decision Compiler Service

Converts decision template inputs into scenarios and scenario changes.
"""
import re
from datetime import date
from decimal import Decimal
from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from apps.core.models import Household
from apps.scenarios.models import Scenario, ScenarioChange, ChangeType
from apps.scenarios.services import ScenarioEngine
from apps.scenarios.baseline import BaselineScenarioService
from .models import DecisionTemplate, DecisionRun


class DecisionCompilerError(Exception):
    """Error during decision compilation."""
    pass


class DecisionCompiler:
    """
    Compiles decision template inputs into scenarios and scenario changes.

    Usage:
        # Create new scenario
        compiler = DecisionCompiler(template_key, inputs, household)
        scenario, changes = compiler.compile()

        # Append to existing scenario
        compiler = DecisionCompiler(template_key, inputs, household, target_scenario=my_scenario)
        scenario, changes = compiler.compile()
    """

    def __init__(
        self,
        template_key: str,
        inputs: dict,
        household: Household,
        start_date: date = None,
        scenario_name_override: str = None,
        target_scenario: Scenario = None,
    ):
        self.template_key = template_key
        self.inputs = inputs
        self.household = household
        self.start_date = start_date
        self.scenario_name_override = scenario_name_override
        self.target_scenario = target_scenario

        # Load the template
        self.template = DecisionTemplate.objects.filter(
            key=template_key,
            is_active=True
        ).first()

        if not self.template:
            raise DecisionCompilerError(f"Template '{template_key}' not found or inactive")

    def compile(self) -> tuple[Scenario, list[ScenarioChange], bool]:
        """
        Compile template inputs into a scenario with changes.

        Returns:
            (Scenario, list[ScenarioChange], scenario_created: bool)
        """
        with transaction.atomic():
            # Get or create baseline using canonical service to avoid duplicate baselines
            baseline = BaselineScenarioService.get_or_create_baseline(self.household)

            # Determine scenario start date
            effective_start = self.start_date or baseline.start_date

            if self.target_scenario:
                # Append mode - validate and use existing scenario
                if self.target_scenario.household_id != self.household.id:
                    raise DecisionCompilerError("Target scenario does not belong to household")
                if self.target_scenario.is_baseline:
                    raise DecisionCompilerError("Cannot append to baseline scenario")
                if self.target_scenario.is_archived:
                    raise DecisionCompilerError("Cannot append to archived scenario")

                scenario = self.target_scenario
                scenario_created = False

                # Get starting display_order for new changes
                max_order = scenario.changes.aggregate(Max('display_order'))['display_order__max'] or -1
                display_order_offset = max_order + 1
            else:
                # Create new scenario
                scenario_name = self._generate_scenario_name()

                scenario = Scenario.objects.create(
                    household=self.household,
                    name=scenario_name,
                    description=f"Created from decision template: {self.template.name}",
                    is_baseline=False,
                    parent_scenario=baseline,
                    start_date=effective_start,
                    projection_months=baseline.projection_months,
                    inflation_rate=baseline.inflation_rate,
                    investment_return_rate=baseline.investment_return_rate,
                    salary_growth_rate=baseline.salary_growth_rate,
                )
                scenario_created = True
                display_order_offset = 0

            # Compile changes from template
            changes = self._compile_changes(scenario, effective_start, display_order_offset)

            # Compute projections
            engine = ScenarioEngine(scenario)
            engine.compute_projection()

            return scenario, changes, scenario_created

    def _generate_scenario_name(self) -> str:
        """Generate a descriptive name for the scenario."""
        if self.scenario_name_override:
            return self.scenario_name_override

        # Use template name with short summary from inputs
        template_name = self.template.name
        summary = self._generate_summary()

        if summary:
            return f"{template_name}: {summary}"
        return template_name

    def _generate_summary(self) -> str:
        """Generate a short summary from inputs for the scenario name."""
        # Look for common summary fields
        summary_fields = ['name', 'expense_name', 'income_name', 'amount', 'purchase_price']

        for field in summary_fields:
            if field in self.inputs:
                value = self.inputs[field]
                if isinstance(value, (int, float, Decimal)):
                    return f"${value:,.0f}"
                elif isinstance(value, str) and value:
                    return value[:30]

        return ""

    def _compile_changes(self, scenario: Scenario, effective_date: date, display_order_offset: int = 0) -> list[ScenarioChange]:
        """Compile template change plan into ScenarioChange records."""
        changes = []
        change_plan = self.template.change_plan

        if not change_plan or 'changes' not in change_plan:
            return changes

        for idx, change_spec in enumerate(change_plan['changes']):
            # Check if this change should be included based on conditions
            if not self._should_include_change(change_spec):
                continue

            change = self._create_change(scenario, change_spec, effective_date, display_order_offset + idx)
            if change:
                changes.append(change)

        return changes

    def _should_include_change(self, change_spec: dict) -> bool:
        """Check if a change should be included based on conditions."""
        condition = change_spec.get('condition')
        if not condition:
            return True

        # Simple condition evaluation: check if input field is truthy
        # Supports: "has_field_name" or "field_name != 0"
        if condition.startswith('has_'):
            field = condition[4:]
            return bool(self.inputs.get(field))
        elif '!=' in condition:
            field, value = condition.split('!=')
            field = field.strip()
            value = value.strip()
            input_value = str(self.inputs.get(field, ''))
            return input_value != value
        elif '==' in condition:
            field, value = condition.split('==')
            field = field.strip()
            value = value.strip()
            input_value = str(self.inputs.get(field, ''))
            return input_value == value

        return True

    def _create_change(
        self,
        scenario: Scenario,
        change_spec: dict,
        effective_date: date,
        order: int
    ) -> ScenarioChange:
        """Create a single ScenarioChange from a change specification."""
        change_type = change_spec.get('change_type')
        if not change_type:
            return None

        # Resolve name template
        name = self._resolve_template(change_spec.get('name_template', ''), change_spec.get('name', 'Change'))

        # Resolve description template
        description = self._resolve_template(change_spec.get('description_template', ''), change_spec.get('description', ''))

        # Resolve parameters
        params_spec = change_spec.get('parameters', {})
        parameters = self._resolve_parameters(params_spec)

        # Determine effective date for this change
        change_date = effective_date
        if 'effective_date_field' in change_spec:
            date_field = change_spec['effective_date_field']
            if date_field in self.inputs:
                try:
                    change_date = date.fromisoformat(self.inputs[date_field])
                except (ValueError, TypeError):
                    pass

        # Determine end date if specified
        end_date = None
        if 'end_date_field' in change_spec:
            end_field = change_spec['end_date_field']
            if end_field in self.inputs:
                try:
                    end_date = date.fromisoformat(self.inputs[end_field])
                except (ValueError, TypeError):
                    pass

        # Resolve source_account_id if specified (for debt payoff, refinance, etc.)
        source_account_id = None
        if 'source_account_id_field' in change_spec:
            account_field = change_spec['source_account_id_field']
            if account_field in self.inputs and self.inputs[account_field]:
                source_account_id = self.inputs[account_field]
                # Try to get account name to make the change name more descriptive
                try:
                    from apps.accounts.models import Account
                    account = Account.objects.filter(id=source_account_id, household=self.household).first()
                    if account:
                        # Update name to include account name
                        name = self._resolve_template(
                            change_spec.get('name_template', '').replace('debt', account.name).replace('loan', account.name),
                            name
                        )
                        if not name or name == 'Change':
                            name = f"{change_spec.get('name', 'Change')} - {account.name}"
                except Exception:
                    pass  # If account lookup fails, continue with generic name

        # Resolve source_flow_id if specified (for income/expense modifications)
        source_flow_id = None
        if 'source_flow_id_field' in change_spec:
            flow_field = change_spec['source_flow_id_field']
            if flow_field in self.inputs and self.inputs[flow_field]:
                source_flow_id = self.inputs[flow_field]

        change = ScenarioChange.objects.create(
            scenario=scenario,
            change_type=change_type,
            name=name,
            description=description,
            effective_date=change_date,
            end_date=end_date,
            source_account_id=source_account_id,
            source_flow_id=source_flow_id,
            parameters=parameters,
            display_order=order,
            is_enabled=True,
        )

        return change

    def _resolve_template(self, template: str, default: str) -> str:
        """Resolve a template string with input values."""
        if not template:
            return default

        result = template
        # Replace {field_name} with input values
        for key, value in self.inputs.items():
            placeholder = f"{{{key}}}"
            if placeholder in result:
                if isinstance(value, (int, float, Decimal)):
                    result = result.replace(placeholder, f"${value:,.0f}")
                else:
                    result = result.replace(placeholder, str(value))

        # Clean up any unreplaced placeholders
        result = re.sub(r'\{[^}]+\}', '', result)
        return result.strip() or default

    def _resolve_parameters(self, params_spec: dict) -> dict:
        """Resolve parameter specifications with input values."""
        parameters = {}

        for key, value_spec in params_spec.items():
            if isinstance(value_spec, str):
                # Check if it's a reference to an input field
                if value_spec.startswith('{') and value_spec.endswith('}'):
                    field_name = value_spec[1:-1]
                    if field_name in self.inputs:
                        parameters[key] = self._convert_value(self.inputs[field_name])
                    # else: skip this parameter
                else:
                    parameters[key] = value_spec
            elif isinstance(value_spec, dict):
                # Nested parameter resolution
                parameters[key] = self._resolve_parameters(value_spec)
            else:
                # Direct value
                parameters[key] = self._convert_value(value_spec)

        return parameters

    def _convert_value(self, value):
        """Convert input value to appropriate type for parameters."""
        if isinstance(value, str):
            # Try to convert to number
            try:
                if '.' in value:
                    return float(value)
                return int(value)
            except (ValueError, TypeError):
                return value
        return value


def compile_decision(
    template_key: str,
    inputs: dict,
    household: Household,
    start_date: date = None,
    scenario_name_override: str = None,
    target_scenario: Scenario = None,
) -> tuple[Scenario, list[ScenarioChange], bool]:
    """
    Convenience function to compile a decision.

    Args:
        template_key: The unique key of the decision template
        inputs: User's answers to the template fields
        household: The household to create the scenario for
        start_date: Optional override for the scenario start date
        scenario_name_override: Optional custom scenario name
        target_scenario: Optional existing scenario to append changes to (append mode)

    Returns:
        (Scenario, list[ScenarioChange], scenario_created: bool)
    """
    compiler = DecisionCompiler(
        template_key=template_key,
        inputs=inputs,
        household=household,
        start_date=start_date,
        scenario_name_override=scenario_name_override,
        target_scenario=target_scenario,
    )
    return compiler.compile()


def create_decision_run(
    template_key: str,
    inputs: dict,
    household: Household,
    scenario_name_override: str = None,
    as_draft: bool = False,
    target_scenario: Scenario = None,
) -> tuple[DecisionRun, bool]:
    """
    Create a decision run record, optionally compiling it immediately.

    Args:
        template_key: The unique key of the decision template
        inputs: User's answers to the template fields
        household: The household
        scenario_name_override: Optional custom scenario name
        as_draft: If True, save as draft without creating scenario
        target_scenario: Optional existing scenario to append changes to (append mode)

    Returns:
        (DecisionRun, scenario_created: bool)
    """
    template = DecisionTemplate.objects.filter(key=template_key, is_active=True).first()

    run = DecisionRun.objects.create(
        household=household,
        template=template,
        template_key=template_key,
        inputs=inputs,
        scenario_name_override=scenario_name_override or '',
        is_draft=as_draft,
    )

    scenario_created = False

    if not as_draft:
        # Compile immediately
        scenario, _, scenario_created = compile_decision(
            template_key=template_key,
            inputs=inputs,
            household=household,
            scenario_name_override=scenario_name_override,
            target_scenario=target_scenario,
        )
        run.created_scenario = scenario
        run.is_draft = False
        run.completed_at = timezone.now()
        run.save()

    return run, scenario_created
