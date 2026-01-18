"""
Baseline Scenario Service

Manages the single canonical baseline scenario for each household.
The baseline scenario always reflects the latest reality (accounts + flows + taxes)
and is automatically re-projected when reality changes.
"""
from datetime import date
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.core.models import Household
from apps.metrics.models import MetricSnapshot
from .models import Scenario, BaselineMode
from .services import ScenarioEngine


class BaselineScenarioService:
    """Service for managing baseline scenarios."""

    DEFAULT_PROJECTION_MONTHS = 120  # 10 years
    DEFAULT_NAME = "Current Trajectory"
    DEFAULT_DESCRIPTION = "Baseline projection from current state"

    @classmethod
    def get_or_create_baseline(
        cls,
        household: Household,
        start_date: date | None = None
    ) -> Scenario:
        """
        Get or create the baseline scenario for a household.

        Args:
            household: The household to get/create baseline for
            start_date: Optional start date (defaults to first of current month)

        Returns:
            The baseline Scenario instance
        """
        # Try to get existing baseline
        try:
            baseline = Scenario.objects.get(
                household=household,
                is_baseline=True
            )
            return baseline
        except Scenario.DoesNotExist:
            pass

        # Create new baseline
        if start_date is None:
            start_date = date.today().replace(day=1)

        with transaction.atomic():
            baseline = Scenario.objects.create(
                household=household,
                name=cls.DEFAULT_NAME,
                description=cls.DEFAULT_DESCRIPTION,
                is_baseline=True,
                baseline_mode=BaselineMode.LIVE,
                start_date=start_date,
                projection_months=cls.DEFAULT_PROJECTION_MONTHS,
                # Use default assumptions from model
                inflation_rate=Decimal('0.03'),
                investment_return_rate=Decimal('0.07'),
                salary_growth_rate=Decimal('0.03'),
            )

        return baseline

    @classmethod
    def refresh_baseline(
        cls,
        household: Household,
        force: bool = False
    ) -> Scenario:
        """
        Refresh the baseline projection for a household.

        Args:
            household: The household to refresh baseline for
            force: If True, refresh even if baseline is pinned

        Returns:
            The updated baseline Scenario instance
        """
        baseline = cls.get_or_create_baseline(household)

        # Don't refresh pinned baselines unless forced
        if baseline.baseline_mode == BaselineMode.PINNED and not force:
            return baseline

        # Upgrade projection_months if below current default
        # This ensures baselines created with older defaults get updated
        if baseline.projection_months < cls.DEFAULT_PROJECTION_MONTHS:
            baseline.projection_months = cls.DEFAULT_PROJECTION_MONTHS
            baseline.save(update_fields=['projection_months'])

        # Pre-flight data integrity checks
        cls._validate_household_data_integrity(household)

        # Compute projection using ScenarioEngine
        engine = ScenarioEngine(baseline)

        # For pinned baselines, use the pinned as_of_date
        as_of_date = None
        if baseline.baseline_mode == BaselineMode.PINNED:
            as_of_date = baseline.baseline_pinned_as_of_date

        engine.compute_projection(as_of_date=as_of_date)

        # Update last_projected_at
        baseline.last_projected_at = timezone.now()
        baseline.save(update_fields=['last_projected_at'])

        return baseline

    @classmethod
    def pin_baseline(
        cls,
        household: Household,
        as_of_date: date
    ) -> Scenario:
        """
        Pin the baseline to a specific as-of date.

        Pinned baselines freeze the starting point for comparisons and
        don't auto-update when reality changes.

        Args:
            household: The household
            as_of_date: The date to pin the baseline to

        Returns:
            The updated baseline Scenario instance
        """
        baseline = cls.get_or_create_baseline(household)

        with transaction.atomic():
            baseline.baseline_mode = BaselineMode.PINNED
            baseline.baseline_pinned_at = timezone.now()
            baseline.baseline_pinned_as_of_date = as_of_date

            # Try to link to a metric snapshot for this date
            try:
                snapshot = MetricSnapshot.objects.get(
                    household=household,
                    as_of_date=as_of_date
                )
                baseline.baseline_metric_snapshot = snapshot
            except MetricSnapshot.DoesNotExist:
                baseline.baseline_metric_snapshot = None

            baseline.save(update_fields=[
                'baseline_mode',
                'baseline_pinned_at',
                'baseline_pinned_as_of_date',
                'baseline_metric_snapshot',
            ])

        # Refresh baseline with pinned initialization
        return cls.refresh_baseline(household, force=True)

    @classmethod
    def unpin_baseline(cls, household: Household) -> Scenario:
        """
        Unpin the baseline, returning it to live mode.

        Args:
            household: The household

        Returns:
            The updated baseline Scenario instance
        """
        baseline = cls.get_or_create_baseline(household)

        with transaction.atomic():
            baseline.baseline_mode = BaselineMode.LIVE
            baseline.baseline_pinned_at = None
            baseline.baseline_pinned_as_of_date = None
            baseline.baseline_metric_snapshot = None
            baseline.save(update_fields=[
                'baseline_mode',
                'baseline_pinned_at',
                'baseline_pinned_as_of_date',
                'baseline_metric_snapshot',
            ])

        # Refresh baseline with live data
        return cls.refresh_baseline(household)

    @classmethod
    def get_baseline_health(cls, household: Household) -> dict:
        """
        Get a health summary of the baseline scenario.

        Returns key metrics from the most recent metric snapshot
        along with baseline status information.

        Args:
            household: The household

        Returns:
            Dictionary with health summary data
        """
        baseline = cls.get_or_create_baseline(household)

        # For pinned baselines, use the pinned snapshot if available
        if baseline.baseline_mode == BaselineMode.PINNED and baseline.baseline_metric_snapshot:
            latest_snapshot = baseline.baseline_metric_snapshot
            # Get previous snapshot before the pinned date for trend calculation
            previous_snapshot = MetricSnapshot.objects.filter(
                household=household,
                as_of_date__lt=latest_snapshot.as_of_date
            ).order_by('-as_of_date').first()
        else:
            # Get latest metric snapshot for live baselines
            latest_snapshot = MetricSnapshot.objects.filter(
                household=household
            ).order_by('-as_of_date').first()

            # Get previous snapshot for trend calculation
            previous_snapshot = MetricSnapshot.objects.filter(
                household=household
            ).order_by('-as_of_date')[1:2].first() if latest_snapshot else None

        # Calculate trends
        def get_trend(current, previous, higher_is_better=True):
            # Use explicit None check to handle Decimal('0') correctly
            if current is None or previous is None:
                return None
            diff = float(current) - float(previous)
            if abs(diff) < 0.001:
                return 'stable'
            if higher_is_better:
                return 'up' if diff > 0 else 'down'
            return 'down' if diff > 0 else 'up'

        health = {
            'baseline_id': str(baseline.id),
            'baseline_mode': baseline.baseline_mode,
            'baseline_pinned_at': baseline.baseline_pinned_at.isoformat() if baseline.baseline_pinned_at else None,
            'baseline_pinned_as_of_date': baseline.baseline_pinned_as_of_date.isoformat() if baseline.baseline_pinned_as_of_date else None,
            'last_projected_at': baseline.last_projected_at.isoformat() if baseline.last_projected_at else None,
            'metrics': None,
        }

        if latest_snapshot:
            health['metrics'] = {
                'as_of_date': latest_snapshot.as_of_date.isoformat(),
                'net_worth': {
                    'value': str(latest_snapshot.net_worth_market),
                    'trend': get_trend(
                        latest_snapshot.net_worth_market,
                        previous_snapshot.net_worth_market if previous_snapshot else None,
                        higher_is_better=True
                    ),
                },
                'monthly_surplus': {
                    'value': str(latest_snapshot.monthly_surplus),
                    'trend': get_trend(
                        latest_snapshot.monthly_surplus,
                        previous_snapshot.monthly_surplus if previous_snapshot else None,
                        higher_is_better=True
                    ),
                },
                'liquidity_months': {
                    'value': str(latest_snapshot.liquidity_months),
                    'trend': get_trend(
                        latest_snapshot.liquidity_months,
                        previous_snapshot.liquidity_months if previous_snapshot else None,
                        higher_is_better=True
                    ),
                },
                'savings_rate': {
                    'value': str(latest_snapshot.savings_rate),
                    'trend': get_trend(
                        latest_snapshot.savings_rate,
                        previous_snapshot.savings_rate if previous_snapshot else None,
                        higher_is_better=True
                    ),
                },
                'dscr': {
                    'value': str(latest_snapshot.dscr),
                    'trend': get_trend(
                        latest_snapshot.dscr,
                        previous_snapshot.dscr if previous_snapshot else None,
                        higher_is_better=True
                    ),
                },
            }

        return health

    @classmethod
    def _validate_household_data_integrity(cls, household: Household) -> None:
        """
        Validate household data integrity before refreshing baseline.

        Checks for data integrity issues that would cause projection computation to fail:
        - Income sources without household members
        - Active accounts without latest snapshots
        - Invalid recurring flow configurations

        Raises:
            ValueError: If data integrity issues are found

        Args:
            household: The household to validate
        """
        from apps.taxes.models import IncomeSource
        from apps.accounts.models import Account
        from apps.flows.models import RecurringFlow

        errors = []

        # Check for income sources without household members
        orphaned_income_sources = IncomeSource.objects.filter(
            household=household,
            household_member__isnull=True
        ).count()
        if orphaned_income_sources > 0:
            errors.append(f'{orphaned_income_sources} income source(s) have no household member assigned')

        # Check for active accounts without snapshots
        accounts_without_snapshots = Account.objects.filter(
            household=household,
            is_active=True,
            snapshots__isnull=True
        ).count()
        if accounts_without_snapshots > 0:
            errors.append(f'{accounts_without_snapshots} active account(s) have no balance snapshots')

        # Check for recurring flows with invalid frequencies
        invalid_flows = RecurringFlow.objects.filter(
            household=household,
            is_active=True,
            frequency__isnull=True
        ).count()
        if invalid_flows > 0:
            errors.append(f'{invalid_flows} active recurring flow(s) have invalid frequency')

        if errors:
            error_message = 'Household data integrity issues found:\n' + '\n'.join(f'  - {e}' for e in errors)
            raise ValueError(error_message)
