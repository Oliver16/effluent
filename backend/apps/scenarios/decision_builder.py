"""
Decision Builder for creating scenarios from action plans.

This module provides functionality to:
- Convert action plans (from goals solver or action templates) into scenarios
- Create scenario changes from plan steps
- Compute projections and return summaries
"""
from datetime import date, timedelta
from decimal import Decimal
from django.db import transaction

from apps.core.models import Household
from .models import Scenario, ScenarioChange, ChangeType
from .services import ScenarioEngine


def run_decision_plan(
    household: Household,
    plan: list,
    scenario_name: str = "Action Plan",
    goal=None,
    parent_scenario=None,
    start_date: date = None,
    fail_on_unknown: bool = False
) -> dict:
    """
    Create a scenario from an action plan.

    Args:
        household: The household to create the scenario for
        plan: List of change specifications (from solver or action templates)
        scenario_name: Name for the new scenario
        goal: Optional Goal object if this is from goal solver
        parent_scenario: Optional parent scenario to inherit from
        start_date: When changes take effect (defaults to first of next month)
        fail_on_unknown: If True, raise error on unknown change types

    Returns:
        dict with:
            - scenario: The created Scenario object
            - changes: List of created ScenarioChange objects
            - skipped_steps: List of skipped steps with reasons
            - summary: Summary of the projection results
            - warnings: List of warnings encountered
    """
    if not start_date:
        today = date.today()
        start_date = today.replace(day=1) + timedelta(days=32)
        start_date = start_date.replace(day=1)

    skipped_steps = []
    warnings = []

    with transaction.atomic():
        # Create the scenario
        scenario = Scenario.objects.create(
            household=household,
            name=scenario_name,
            description=f"Created from action plan" + (f" for goal: {goal.display_name}" if goal else ""),
            start_date=start_date,
            parent_scenario=parent_scenario,
            projection_months=60,  # Default 5 years
        )

        # Create changes from plan
        created_changes = []
        for idx, step in enumerate(plan):
            change_type = step.get('change_type', '')
            params = step.get('parameters', {})

            # Validate change type
            change_type_enum = None
            if change_type:
                # Try uppercase attribute access first
                if hasattr(ChangeType, change_type.upper()):
                    change_type_enum = ChangeType[change_type.upper()]
                else:
                    # Try as lowercase value
                    for ct in ChangeType:
                        if ct.value == change_type.lower():
                            change_type_enum = ct
                            break

            if not change_type_enum:
                skip_reason = f"Unknown change_type: '{change_type}'"
                skipped_steps.append({
                    'step_index': idx,
                    'step_name': step.get('name', f"Step {idx + 1}"),
                    'change_type': change_type,
                    'reason': skip_reason,
                })
                if fail_on_unknown:
                    raise ValueError(f"Step {idx}: {skip_reason}")
                warnings.append(f"Step {idx} skipped: {skip_reason}")
                continue

            # Use step-level dates if provided, otherwise fall back to plan start_date
            # TASK-14: Support per-step effective_date and end_date
            step_effective_date = None
            if 'start_date' in params:
                try:
                    step_effective_date = date.fromisoformat(str(params['start_date']))
                except (ValueError, TypeError):
                    pass
            if 'effective_date' in step:
                try:
                    step_effective_date = date.fromisoformat(str(step['effective_date']))
                except (ValueError, TypeError):
                    pass
            if not step_effective_date:
                step_effective_date = start_date

            step_end_date = None
            if 'end_date' in params:
                try:
                    step_end_date = date.fromisoformat(str(params['end_date']))
                except (ValueError, TypeError):
                    pass
            if 'end_date' in step:
                try:
                    step_end_date = date.fromisoformat(str(step['end_date']))
                except (ValueError, TypeError):
                    pass

            change = ScenarioChange.objects.create(
                scenario=scenario,
                change_type=change_type_enum,
                name=step.get('name', f"Step {idx + 1}"),
                description=params.get('description', ''),
                effective_date=step_effective_date,
                end_date=step_end_date,
                parameters=params,
                display_order=idx,
                is_enabled=True,
            )
            created_changes.append(change)

        # Compute projections
        engine = ScenarioEngine(scenario)
        projections = engine.compute_projection()

        # Generate summary
        summary = _generate_projection_summary(projections, household, goal)

        result = {
            'scenario': scenario,
            'changes': created_changes,
            'summary': summary,
        }

        if skipped_steps:
            result['skipped_steps'] = skipped_steps
        if warnings:
            result['warnings'] = warnings

        return result


def _generate_projection_summary(projections: list, household=None, goal=None) -> dict:
    """
    Generate summary statistics from projections.

    Args:
        projections: List of ScenarioProjection objects
        household: Optional Household for looking up goal targets
        goal: Optional specific Goal for context
    """
    if not projections:
        return {}

    first = projections[0]
    last = projections[-1]

    # Find worst DSCR month
    worst_dscr = min(projections, key=lambda p: p.dscr)

    # Find worst liquidity month
    worst_liquidity = min(projections, key=lambda p: p.liquidity_months)

    # Get liquidity target from goals or use default
    liquidity_target = Decimal('6')  # Default fallback
    if household:
        try:
            from apps.goals.models import Goal, GoalType
            emergency_fund_goal = Goal.objects.filter(
                household=household,
                goal_type=GoalType.EMERGENCY_FUND_MONTHS,
                is_active=True
            ).first()
            if emergency_fund_goal:
                liquidity_target = emergency_fund_goal.target_value
        except Exception:
            pass  # Use default

    # Find when liquidity target is reached
    liquidity_target_month = None
    for proj in projections:
        if proj.liquidity_months >= liquidity_target:
            liquidity_target_month = proj.month_number
            break

    return {
        'start': {
            'date': str(first.projection_date),
            'net_worth': str(first.net_worth),
            'liquidity_months': str(first.liquidity_months),
            'dscr': str(first.dscr),
            'savings_rate': str(first.savings_rate),
        },
        'end': {
            'date': str(last.projection_date),
            'net_worth': str(last.net_worth),
            'liquidity_months': str(last.liquidity_months),
            'dscr': str(last.dscr),
            'savings_rate': str(last.savings_rate),
        },
        'changes': {
            'net_worth_delta': str(last.net_worth - first.net_worth),
            'liquidity_months_delta': str(last.liquidity_months - first.liquidity_months),
        },
        'milestones': {
            'worst_dscr_month': worst_dscr.month_number,
            'worst_dscr_value': str(worst_dscr.dscr),
            'worst_liquidity_month': worst_liquidity.month_number,
            'worst_liquidity_value': str(worst_liquidity.liquidity_months),
            'liquidity_target': str(liquidity_target),
            'liquidity_target_reached_month': liquidity_target_month,
        },
        'projection_count': len(projections),
    }


# Decision templates registry
DECISION_TEMPLATES = {
    'adjust_total_expenses': {
        'name': 'Reduce Total Expenses',
        'description': 'Reduce overall monthly expenses by a target amount',
        'change_type': ChangeType.ADJUST_TOTAL_EXPENSES,
        'inputs_schema': {
            'monthly_reduction': {'type': 'money', 'label': 'Monthly Reduction Target', 'default': 500},
        },
        'compile': lambda inputs: {
            'change_type': 'ADJUST_TOTAL_EXPENSES',
            'name': f'Reduce expenses by ${inputs.get("monthly_reduction", 500)}/mo',
            'parameters': {
                'monthly_adjustment': str(-abs(Decimal(str(inputs.get('monthly_reduction', 500))))),
                'description': 'Expense reduction from action plan',
            }
        }
    },
    'adjust_total_income': {
        'name': 'Increase Total Income',
        'description': 'Increase monthly income through additional work',
        'change_type': ChangeType.ADJUST_TOTAL_INCOME,
        'inputs_schema': {
            'monthly_increase': {'type': 'money', 'label': 'Monthly Gross Increase', 'default': 1000},
            'tax_treatment': {'type': 'select', 'label': 'Tax Treatment', 'options': ['w2', '1099'], 'default': 'w2'},
        },
        'compile': lambda inputs: {
            'change_type': 'ADJUST_TOTAL_INCOME',
            'name': f'Increase income by ${inputs.get("monthly_increase", 1000)}/mo',
            'parameters': {
                'monthly_adjustment': str(Decimal(str(inputs.get('monthly_increase', 1000)))),
                'tax_treatment': inputs.get('tax_treatment', 'w2'),
                'description': 'Income increase from action plan',
            }
        }
    },
    'payoff_debt': {
        'name': 'Accelerate Debt Payoff',
        'description': 'Add extra monthly payments to a debt',
        'change_type': ChangeType.PAYOFF_DEBT,
        'inputs_schema': {
            'extra_monthly': {'type': 'money', 'label': 'Extra Monthly Payment', 'default': 300},
            'debt_account_id': {'type': 'account_select', 'label': 'Debt Account', 'filter': 'liability'},
        },
        'compile': lambda inputs: {
            'change_type': 'PAYOFF_DEBT',
            'name': f'Extra ${inputs.get("extra_monthly", 300)}/mo to debt',
            'parameters': {
                'extra_monthly': str(inputs.get('extra_monthly', 300)),
                'source_account_id': inputs.get('debt_account_id'),
            }
        }
    },
    'modify_401k': {
        'name': 'Adjust 401(k) Contribution',
        'description': 'Change 401(k) contribution percentage',
        'change_type': ChangeType.MODIFY_401K,
        'inputs_schema': {
            'percentage': {'type': 'percent', 'label': 'New Contribution %', 'default': 10, 'min': 0, 'max': 100},
        },
        'compile': lambda inputs: {
            'change_type': 'MODIFY_401K',
            'name': f'Set 401(k) to {inputs.get("percentage", 10)}%',
            'parameters': {
                'percentage': inputs.get('percentage', 10),
            }
        }
    },
    'set_savings_transfer': {
        'name': 'Set Up Savings Transfer',
        'description': 'Transfer a fixed amount monthly to savings/investment account',
        'change_type': ChangeType.SET_SAVINGS_TRANSFER,
        'inputs_schema': {
            'amount': {'type': 'money', 'label': 'Monthly Transfer Amount', 'default': 500},
            'target_account_id': {'type': 'account_select', 'label': 'Target Account', 'filter': 'asset'},
        },
        'compile': lambda inputs: {
            'change_type': 'SET_SAVINGS_TRANSFER',
            'name': f'Save ${inputs.get("amount", 500)}/mo',
            'parameters': {
                'amount': str(inputs.get('amount', 500)),
                'target_account_id': inputs.get('target_account_id'),
            }
        }
    },
    'refinance': {
        'name': 'Refinance Debt',
        'description': 'Refinance an existing debt at a new rate/term',
        'change_type': ChangeType.REFINANCE,
        'inputs_schema': {
            'debt_account_id': {'type': 'account_select', 'label': 'Debt to Refinance', 'filter': 'liability'},
            'new_rate': {'type': 'percent', 'label': 'New Interest Rate', 'default': 5.5},
            'new_term_months': {'type': 'number', 'label': 'New Term (months)', 'default': 360},
            'closing_costs': {'type': 'money', 'label': 'Closing Costs', 'default': 3000},
        },
        'compile': lambda inputs: {
            'change_type': 'REFINANCE',
            'name': f'Refinance at {inputs.get("new_rate", 5.5)}%',
            'parameters': {
                'source_account_id': inputs.get('debt_account_id'),
                'rate': inputs.get('new_rate', 5.5) / 100,
                'term_months': inputs.get('new_term_months', 360),
                'closing_costs': str(inputs.get('closing_costs', 3000)),
            }
        }
    },
}


def get_decision_templates():
    """Get all available decision templates."""
    return [
        {
            'id': key,
            'name': tpl['name'],
            'description': tpl['description'],
            'change_type': tpl['change_type'].value,
            'inputs_schema': tpl['inputs_schema'],
        }
        for key, tpl in DECISION_TEMPLATES.items()
    ]


def compile_decision_template(template_id: str, inputs: dict) -> dict:
    """Compile a decision template with user inputs into a plan step."""
    if template_id not in DECISION_TEMPLATES:
        raise ValueError(f"Unknown decision template: {template_id}")

    template = DECISION_TEMPLATES[template_id]
    return template['compile'](inputs)
