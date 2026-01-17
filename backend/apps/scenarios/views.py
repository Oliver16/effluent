from datetime import date
from celery.result import AsyncResult
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView

from .models import Scenario, ScenarioChange, ScenarioProjection, ScenarioComparison, LifeEventTemplate, LifeEventCategory, ChangeType
from .serializers import (
    ScenarioSerializer, ScenarioDetailSerializer, ScenarioChangeSerializer,
    ScenarioProjectionSerializer, ScenarioComparisonSerializer, LifeEventTemplateSerializer,
    BaselineScenarioSerializer
)
from .services import ScenarioEngine
from .baseline import BaselineScenarioService
from .comparison import ScenarioComparisonService
from .merge import merge_scenarios
from .tasks import (
    refresh_baseline_task,
    compute_projection_task,
    compare_scenarios_task,
    apply_life_event_task
)


class ScenarioViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Scenario.objects.filter(household=self.request.household)
        if self.request.query_params.get('active_only', 'true').lower() == 'true':
            qs = qs.filter(is_active=True, is_archived=False)
        # Exclude stress test scenarios by default (they're accessed via stress-tests endpoint)
        if self.request.query_params.get('include_stress_tests', 'false').lower() != 'true':
            qs = qs.filter(is_stress_test=False)

        # Optimize queries by prefetching related objects to avoid N+1 queries
        qs = qs.prefetch_related('changes', 'projections').select_related('parent_scenario')

        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ScenarioDetailSerializer
        return ScenarioSerializer

    def perform_create(self, serializer):
        serializer.save(household=self.request.household)

    def perform_destroy(self, instance):
        """Delete a scenario with validation."""
        if instance.is_baseline:
            from rest_framework.exceptions import ValidationError
            raise ValidationError("Cannot delete the baseline scenario")
        # Related ScenarioChange and ScenarioProjection records are deleted via CASCADE
        instance.delete()

    @action(detail=True, methods=['post'])
    def compute(self, request, pk=None):
        """Compute projections for this scenario (async by default)."""
        from django.core.cache import cache

        scenario = self.get_object()
        run_async = request.data.get('async', True)  # Default to async
        horizon_months = request.data.get('horizon_months')

        if run_async:
            task = compute_projection_task.apply_async(
                kwargs={
                    'scenario_id': str(scenario.id),
                    'horizon_months': horizon_months,
                    'in_memory': False
                }
            )

            # Store task -> household mapping for security validation (1 hour TTL)
            cache.set(f'task_household:{task.id}', str(scenario.household_id), 3600)

            return Response({
                'task_id': task.id,
                'status': 'pending',
                'scenario_id': str(scenario.id),
                'message': 'Projection computation started. Poll /api/v1/scenarios/tasks/{task_id}/ for results.'
            }, status=status.HTTP_202_ACCEPTED)

        # Synchronous for backwards compatibility
        engine = ScenarioEngine(scenario)
        projections = engine.compute_projection(horizon_months=horizon_months)
        return Response({
            'status': 'computed',
            'projection_count': len(projections)
        })

    @action(detail=True, methods=['get'])
    def projections(self, request, pk=None):
        """Get all projections for this scenario."""
        scenario = self.get_object()
        projections = scenario.projections.all()
        serializer = ScenarioProjectionSerializer(projections, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def compare(self, request):
        """
        Compare projections across scenarios with driver decomposition.

        POST /api/v1/scenarios/compare/
        {
            "scenario_ids": ["id1", "id2", ...],
            "horizon_months": 60,  // optional, max 360
            "include_drivers": true  // optional, default true
        }

        Returns projections for each scenario and driver decomposition
        explaining what changed and why relative to the first scenario (baseline).
        """
        scenario_ids = request.data.get('scenario_ids', [])
        horizon_months = request.data.get('horizon_months')
        include_drivers = request.data.get('include_drivers', True)

        # Ensure household is available
        if not request.household:
            return Response(
                {'error': 'No household context available'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate constraints (TASK-15: max 4 scenarios, max 360 months)
        if len(scenario_ids) > ScenarioComparisonService.MAX_SCENARIOS:
            return Response(
                {'error': f'Maximum {ScenarioComparisonService.MAX_SCENARIOS} scenarios allowed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if horizon_months is not None:
            try:
                horizon_months = int(horizon_months)
            except (TypeError, ValueError):
                return Response(
                    {'error': 'horizon_months must be a positive integer'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if horizon_months < 1:
                return Response(
                    {'error': 'horizon_months must be at least 1'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if horizon_months > ScenarioComparisonService.MAX_HORIZON_MONTHS:
                return Response(
                    {'error': f'Maximum horizon is {ScenarioComparisonService.MAX_HORIZON_MONTHS} months'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Fetch scenarios with ownership validation
        scenarios = list(Scenario.objects.filter(
            household=request.household,
            id__in=scenario_ids
        ))

        if len(scenarios) != len(scenario_ids):
            return Response(
                {'error': 'One or more scenarios not found or not accessible'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Build basic comparison results
        # If horizon exceeds scenario's projection_months, compute extended projections in-memory
        comparisons = []
        for scenario in scenarios:
            if horizon_months and scenario.projection_months < horizon_months:
                # Compute extended projections in-memory (don't save to DB)
                # Temporarily increase projection_months for computation only
                original_months = scenario.projection_months
                scenario.projection_months = horizon_months
                engine = ScenarioEngine(scenario)
                projections = engine.compute_projection(in_memory=True)
                # Restore original projection_months (no DB write occurred)
                scenario.projection_months = original_months
                # Limit to requested horizon
                projections = projections[:horizon_months]
            else:
                # Use existing projections from DB
                projections = scenario.projections.all()
                if horizon_months:
                    projections = projections[:horizon_months]

            comparisons.append({
                'scenario': ScenarioSerializer(scenario).data,
                'projections': ScenarioProjectionSerializer(projections, many=True).data,
            })

        result = {'results': comparisons}

        # Add driver decomposition if requested and we have multiple scenarios
        if include_drivers and len(scenarios) >= 2:
            service = ScenarioComparisonService(request.household)
            try:
                driver_analysis = service.compare_multiple(
                    scenarios,
                    horizon_months=horizon_months
                )

                # Convert driver objects to dicts
                result['driver_analysis'] = {
                    'baseline_id': driver_analysis['baseline_id'],
                    'baseline_name': driver_analysis['baseline_name'],
                    'comparisons': [
                        {
                            'scenario_id': c.scenario_id,
                            'horizon_months': c.horizon_months,
                            'baseline_end_nw': float(c.baseline_end_nw),
                            'scenario_end_nw': float(c.scenario_end_nw),
                            'net_worth_delta': float(c.net_worth_delta),
                            'drivers': [
                                {
                                    'name': d.name,
                                    'amount': float(d.amount),
                                    'description': d.description,
                                }
                                for d in c.drivers
                            ],
                            'reconciliation_error_percent': float(c.reconciliation_error_percent),
                        }
                        for c in driver_analysis['comparisons']
                    ],
                }
            except ValueError as e:
                # Include error but don't fail the whole request
                result['driver_analysis'] = {'error': str(e)}

        return Response(result)

    @action(detail=True, methods=['post'])
    def adopt(self, request, pk=None):
        """
        Adopt a scenario: persist its overlay changes as real data.

        POST /api/v1/scenarios/{id}/adopt/

        This converts scenario changes into actual RecurringFlows and updates,
        making the scenario's projections the new baseline reality.
        """
        from apps.flows.models import RecurringFlow, FlowType

        scenario = self.get_object()

        if scenario.is_baseline:
            return Response(
                {'error': 'Cannot adopt the baseline scenario'},
                status=status.HTTP_400_BAD_REQUEST
            )

        adopted_changes = []
        skipped_changes = []

        for change in scenario.changes.filter(is_enabled=True):
            params = change.parameters

            # Handle changes that can be converted to persistent data
            if change.change_type == ChangeType.ADD_EXPENSE:
                # Support both old 'category' field and new 'expense_category' field
                expense_cat = params.get('expense_category') or params.get('category', 'miscellaneous')
                flow = RecurringFlow.objects.create(
                    household=request.household,
                    name=change.name,
                    description=change.description,
                    flow_type=FlowType.EXPENSE,
                    amount=params.get('amount', 0),
                    frequency=params.get('frequency', 'monthly'),
                    expense_category=expense_cat,
                    start_date=change.effective_date,
                    end_date=change.end_date,
                    linked_account_id=params.get('linked_account_id'),
                    is_baseline=True,
                    is_active=True,
                )
                adopted_changes.append({
                    'change_id': str(change.id),
                    'type': 'ADD_EXPENSE',
                    'flow_id': str(flow.id),
                })

            elif change.change_type == ChangeType.ADD_INCOME:
                from apps.taxes.models import IncomeSource
                from apps.core.models import HouseholdMember

                # Support both old 'category' field and new 'income_category' field
                income_cat = params.get('income_category') or params.get('category', 'other_income')
                income_type = params.get('income_type', 'other')
                income_source_id = params.get('income_source_id')
                household_member_id = params.get('household_member_id')

                # Get or create income source for proper tax calculation
                income_source = None
                if income_source_id:
                    # User selected existing income source
                    try:
                        income_source = IncomeSource.objects.get(
                            id=income_source_id,
                            household=request.household
                        )
                    except IncomeSource.DoesNotExist:
                        pass

                if not income_source and household_member_id:
                    # Create new income source for this income
                    from decimal import Decimal
                    try:
                        member = HouseholdMember.objects.get(
                            id=household_member_id,
                            household=request.household
                        )
                        # Calculate annual salary based on frequency
                        amount = Decimal(str(params.get('amount', 0)))
                        freq = params.get('frequency', 'monthly')
                        freq_multipliers = {
                            'weekly': 52, 'biweekly': 26, 'semimonthly': 24,
                            'monthly': 12, 'quarterly': 4, 'annually': 1
                        }
                        annual_salary = amount * freq_multipliers.get(freq, 12)

                        # Map flow frequency to income source pay_frequency
                        pay_freq_map = {
                            'weekly': 'weekly', 'biweekly': 'biweekly',
                            'semimonthly': 'semimonthly', 'monthly': 'monthly',
                            'quarterly': 'monthly', 'annually': 'monthly'
                        }
                        pay_frequency = pay_freq_map.get(freq, 'monthly')

                        income_source = IncomeSource.objects.create(
                            household=request.household,
                            household_member=member,
                            name=change.name,
                            income_type=income_type,
                            gross_annual_salary=annual_salary,
                            pay_frequency=pay_frequency,
                            start_date=change.effective_date,
                            end_date=change.end_date,
                            is_active=True,
                        )
                    except HouseholdMember.DoesNotExist:
                        pass

                flow = RecurringFlow.objects.create(
                    household=request.household,
                    name=change.name,
                    description=change.description,
                    flow_type=FlowType.INCOME,
                    amount=params.get('amount', 0),
                    frequency=params.get('frequency', 'monthly'),
                    income_category=income_cat,
                    start_date=change.effective_date,
                    end_date=change.end_date,
                    linked_account_id=params.get('linked_account_id'),
                    household_member_id=household_member_id,
                    income_source=income_source,
                    is_baseline=True,
                    is_active=True,
                )
                adopted_changes.append({
                    'change_id': str(change.id),
                    'type': 'ADD_INCOME',
                    'flow_id': str(flow.id),
                    'income_source_id': str(income_source.id) if income_source else None,
                })

            elif change.change_type == ChangeType.SET_SAVINGS_TRANSFER:
                flow = RecurringFlow.objects.create(
                    household=request.household,
                    name=change.name or 'Savings Transfer',
                    description='Automatic savings transfer',
                    flow_type=FlowType.TRANSFER,
                    amount=params.get('amount', 0),
                    frequency='monthly',
                    start_date=change.effective_date,
                    linked_account_id=params.get('target_account_id'),
                    is_baseline=True,
                    is_active=True,
                )
                adopted_changes.append({
                    'change_id': str(change.id),
                    'type': 'SET_SAVINGS_TRANSFER',
                    'flow_id': str(flow.id),
                })

            else:
                # Overlay adjustments and other synthetic changes can't be adopted
                skipped_changes.append({
                    'change_id': str(change.id),
                    'type': change.change_type,
                    'reason': 'Overlay/synthetic changes cannot be adopted',
                })

        # Archive the scenario after adoption
        scenario.is_archived = True
        scenario.description = f"{scenario.description}\n\nAdopted on {date.today()}"
        scenario.save()

        # Trigger baseline refresh
        from .reality_events import emit_flows_changed
        emit_flows_changed(request.household)

        return Response({
            'status': 'adopted',
            'adopted_changes': adopted_changes,
            'skipped_changes': skipped_changes,
            'scenario_archived': True,
        })

    @action(detail=True, methods=['post'])
    def merge(self, request, pk=None):
        """
        Merge changes from another scenario into this one.

        POST /api/v1/scenarios/{id}/merge/
        {
            "source_scenario_id": "uuid",
            "dedupe": true,        // optional, skip duplicates (default true)
            "recompute": true      // optional, recompute projections (default true)
        }

        This combines two scenarios, copying all enabled changes from the source
        into the target (this scenario). Think of it like merging branches.
        Use this to build complex scenarios by combining multiple life events.

        Returns:
            {
                "status": "merged",
                "target_scenario_id": "...",
                "source_scenario_id": "...",
                "changes_copied": 5,
                "changes_skipped": 1,
                "copied": [...],
                "skipped": [...],
                "warnings": [...],
                "projection_recomputed": true
            }
        """
        target = self.get_object()
        source_id = request.data.get('source_scenario_id')
        dedupe = request.data.get('dedupe', True)
        recompute = request.data.get('recompute', True)

        if not source_id:
            return Response(
                {'error': 'source_scenario_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Fetch source scenario with ownership validation
        try:
            source = Scenario.objects.get(
                id=source_id,
                household=request.household
            )
        except Scenario.DoesNotExist:
            return Response(
                {'error': 'Source scenario not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            result = merge_scenarios(
                household=request.household,
                source=source,
                target=target,
                dedupe=dedupe,
                recompute=recompute,
            )
            return Response(result)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ScenarioChangeViewSet(viewsets.ModelViewSet):
    serializer_class = ScenarioChangeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        scenario_id = self.request.query_params.get('scenario')
        if scenario_id:
            return ScenarioChange.objects.filter(
                scenario_id=scenario_id,
                scenario__household=self.request.household
            )
        return ScenarioChange.objects.filter(scenario__household=self.request.household)

    def perform_create(self, serializer):
        # Ensure the scenario belongs to the user's household
        scenario = serializer.validated_data['scenario']
        if scenario.household != self.request.household:
            raise PermissionDenied("Cannot add changes to scenarios in other households")
        serializer.save()


class ScenarioComparisonViewSet(viewsets.ModelViewSet):
    serializer_class = ScenarioComparisonSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ScenarioComparison.objects.filter(household=self.request.household)

    def perform_create(self, serializer):
        serializer.save(household=self.request.household)


class BaselineView(APIView):
    """
    API endpoints for managing the baseline scenario.

    GET /api/scenarios/baseline/ - Get baseline scenario
    POST /api/scenarios/baseline/refresh/ - Trigger refresh
    POST /api/scenarios/baseline/pin/ - Pin baseline to a date
    POST /api/scenarios/baseline/unpin/ - Unpin baseline
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get the baseline scenario with health summary."""
        baseline = BaselineScenarioService.get_or_create_baseline(request.household)
        health = BaselineScenarioService.get_baseline_health(request.household)

        return Response({
            'baseline': BaselineScenarioSerializer(baseline).data,
            'health': health,
        })

    def post(self, request):
        """Handle baseline actions via action parameter."""
        from django.core.cache import cache

        action_type = request.data.get('action')
        run_async = request.data.get('async', True)  # Default to async

        if action_type == 'refresh':
            if run_async:
                task = refresh_baseline_task.apply_async(
                    kwargs={'household_id': str(request.household.id)}
                )

                # Store task -> household mapping for security validation (1 hour TTL)
                cache.set(f'task_household:{task.id}', str(request.household.id), 3600)

                return Response({
                    'task_id': task.id,
                    'status': 'pending',
                    'message': 'Baseline refresh started. Poll /api/v1/scenarios/tasks/{task_id}/ for results.'
                }, status=status.HTTP_202_ACCEPTED)

            # Synchronous for backwards compatibility
            baseline = BaselineScenarioService.refresh_baseline(
                request.household,
                force=request.data.get('force', False)
            )
            return Response({
                'status': 'refreshed',
                'baseline': BaselineScenarioSerializer(baseline).data,
                'last_projected_at': baseline.last_projected_at.isoformat() if baseline.last_projected_at else None,
            })

        elif action_type == 'pin':
            as_of_date_str = request.data.get('as_of_date')
            if not as_of_date_str:
                return Response(
                    {'error': 'as_of_date is required for pin action'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                as_of_date = date.fromisoformat(as_of_date_str)
            except ValueError:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            baseline = BaselineScenarioService.pin_baseline(request.household, as_of_date)
            return Response({
                'status': 'pinned',
                'baseline': BaselineScenarioSerializer(baseline).data,
                'baseline_pinned_at': baseline.baseline_pinned_at.isoformat() if baseline.baseline_pinned_at else None,
                'baseline_pinned_as_of_date': baseline.baseline_pinned_as_of_date.isoformat() if baseline.baseline_pinned_as_of_date else None,
            })

        elif action_type == 'unpin':
            baseline = BaselineScenarioService.unpin_baseline(request.household)
            return Response({
                'status': 'unpinned',
                'baseline': BaselineScenarioSerializer(baseline).data,
            })

        else:
            return Response(
                {'error': f'Unknown action: {action_type}. Valid actions: refresh, pin, unpin'},
                status=status.HTTP_400_BAD_REQUEST
            )


class LifeEventTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for life event templates (read-only)."""
    serializer_class = LifeEventTemplateSerializer
    permission_classes = [IsAuthenticated]
    # Allow template names (with spaces/special chars) as lookup values, not just UUIDs
    lookup_value_regex = '[^/]+'

    def get_queryset(self):
        qs = LifeEventTemplate.objects.filter(is_active=True)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        return qs

    def list(self, request, *args, **kwargs):
        """List templates, grouped by category."""
        queryset = self.get_queryset()

        # If no templates exist in DB, return defaults
        if not queryset.exists():
            templates = LifeEventTemplate.get_default_templates()
            # Group by category
            grouped = {}
            for t in templates:
                cat = t['category']
                cat_display = LifeEventCategory(cat).label
                if cat not in grouped:
                    grouped[cat] = {
                        'category': cat,
                        'category_display': cat_display,
                        'templates': []
                    }
                grouped[cat]['templates'].append(t)

            return Response({
                'results': list(grouped.values()),
                'count': len(templates)
            })

        serializer = self.get_serializer(queryset, many=True)

        # Group by category
        grouped = {}
        for t in serializer.data:
            cat = t['category']
            cat_display = t['category_display']
            if cat not in grouped:
                grouped[cat] = {
                    'category': cat,
                    'category_display': cat_display,
                    'templates': []
                }
            grouped[cat]['templates'].append(t)

        return Response({
            'results': list(grouped.values()),
            'count': len(serializer.data)
        })

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """List available life event categories."""
        return Response({
            'categories': [
                {'value': choice[0], 'label': choice[1]}
                for choice in LifeEventCategory.choices
            ]
        })

    @action(detail=True, methods=['post'])
    def apply(self, request, pk=None):
        """Apply a template to a scenario, creating changes."""
        template_data = None

        # Try to get from DB first
        try:
            template = self.get_object()
            template_data = {
                'name': template.name,
                'suggested_changes': template.suggested_changes,
            }
        except Exception:
            # Fall back to defaults - pk might be template name (URL-decoded)
            templates = LifeEventTemplate.get_default_templates()
            for t in templates:
                # Match by id or name (name comparison is case-sensitive)
                if str(t.get('id', '')) == pk or t['name'] == pk:
                    template_data = t
                    break

        if not template_data:
            return Response(
                {'error': 'Template not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        scenario_id = request.data.get('scenario_id')
        scenario_name = request.data.get('scenario_name')
        parent_scenario_id = request.data.get('parent_scenario_id')
        effective_date_str = request.data.get('effective_date')
        change_values = request.data.get('change_values', {})  # User-provided values

        # Parse effective_date - use today if not provided
        if effective_date_str:
            try:
                effective_date = date.fromisoformat(effective_date_str)
            except ValueError:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            effective_date = date.today()

        scenario_created = False

        if scenario_id:
            # Append mode - use existing scenario
            try:
                scenario = Scenario.objects.get(
                    id=scenario_id,
                    household=request.household
                )
            except Scenario.DoesNotExist:
                return Response(
                    {'error': 'Scenario not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        elif scenario_name:
            # Create mode - create new scenario
            parent = None
            if parent_scenario_id:
                try:
                    parent = Scenario.objects.get(
                        id=parent_scenario_id,
                        household=request.household
                    )
                except Scenario.DoesNotExist:
                    return Response(
                        {'error': 'Parent scenario not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )

            # Use effective_date as start_date for the scenario
            start_date = effective_date.replace(day=1)

            scenario = Scenario.objects.create(
                household=request.household,
                name=scenario_name,
                description=f"Created from life event: {template_data['name']}",
                start_date=start_date,
                parent_scenario=parent,
                projection_months=120,  # Default 10 years
            )
            scenario_created = True
        else:
            return Response(
                {'error': 'Either scenario_id or scenario_name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        created_changes = []
        suggested_changes = template_data.get('suggested_changes', [])

        # Get starting display_order for append mode
        from django.db.models import Max
        max_order = scenario.changes.aggregate(Max('display_order'))['display_order__max'] or -1
        display_order_offset = max_order + 1

        for idx, change_template in enumerate(suggested_changes):
            # Get user values for this change (by index or name)
            user_values = change_values.get(str(idx), change_values.get(change_template['name'], {}))

            # Skip if user explicitly disabled this change
            if user_values.get('_skip', False):
                continue

            # Merge template parameters with user values
            parameters = {**change_template.get('parameters_template', {}), **user_values}

            # Remove internal flags
            parameters.pop('_skip', None)

            # Extract source_flow_id if provided (for MODIFY_INCOME, REMOVE_INCOME, etc.)
            source_flow_id = None
            if 'source_flow_id' in user_values:
                source_flow_id = user_values.get('source_flow_id')
                parameters.pop('source_flow_id', None)  # Don't duplicate in parameters

            # Also check for source_income_flow_id or source_expense_flow_id
            if 'source_income_flow_id' in user_values:
                source_flow_id = user_values.get('source_income_flow_id')
                parameters.pop('source_income_flow_id', None)
            if 'source_expense_flow_id' in user_values:
                source_flow_id = user_values.get('source_expense_flow_id')
                parameters.pop('source_expense_flow_id', None)

            # Extract source_account_id if provided (for asset/debt changes)
            source_account_id = None
            if 'source_account_id' in user_values:
                source_account_id = user_values.get('source_account_id')
                parameters.pop('source_account_id', None)

            change = ScenarioChange.objects.create(
                scenario=scenario,
                change_type=change_template['change_type'],
                name=change_template['name'],
                description=change_template.get('description', ''),
                effective_date=effective_date,
                source_flow_id=source_flow_id,
                source_account_id=source_account_id,
                parameters=parameters,
                display_order=display_order_offset + idx,
                is_enabled=True,
            )
            created_changes.append(change)

        # Compute projections for newly created scenarios
        if scenario_created and created_changes:
            engine = ScenarioEngine(scenario)
            engine.compute_projection()

        response_data = {
            'status': 'applied',
            'template_name': template_data['name'],
            'changes_created': len(created_changes),
            'changes': ScenarioChangeSerializer(created_changes, many=True).data,
            'scenario_id': str(scenario.id),
            'scenario_name': scenario.name,
            'scenario_created': scenario_created,
        }

        return Response(response_data)


class ScenarioTaskStatusView(APIView):
    """Check status of an async scenario task."""
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        """
        Get the status and result of a scenario task.

        Security: Validates that the task belongs to the requesting user's household
        by checking a task_id -> household_id mapping stored in cache.
        """
        from django.core.cache import cache

        # Validate task ownership
        cached_household_id = cache.get(f'task_household:{task_id}')

        if not cached_household_id:
            # Task ID not found or expired - could be old task or invalid ID
            return Response({
                'error': 'Task not found or expired'
            }, status=status.HTTP_404_NOT_FOUND)

        # Verify task belongs to requesting user's household
        if not request.household or str(request.household.id) != str(cached_household_id):
            return Response({
                'error': 'Access denied to this task'
            }, status=status.HTTP_403_FORBIDDEN)

        task_result = AsyncResult(task_id)

        if task_result.ready():
            if task_result.successful():
                result = task_result.result
                # Clean up cache entry after successful retrieval
                cache.delete(f'task_household:{task_id}')
                return Response({
                    'task_id': task_id,
                    'status': 'completed',
                    'result': result
                })
            else:
                # Clean up cache entry after failed retrieval
                cache.delete(f'task_household:{task_id}')
                return Response({
                    'task_id': task_id,
                    'status': 'failed',
                    'error': str(task_result.result)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response({
                'task_id': task_id,
                'status': 'pending',
                'state': task_result.state
            })
