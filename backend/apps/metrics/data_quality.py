"""Data quality and model confidence reporting."""

from dataclasses import dataclass, field
from datetime import timedelta
from decimal import Decimal
from typing import Optional

from django.utils import timezone


@dataclass
class DataQualityItem:
    """Represents a missing or warning data quality item."""
    key: str
    severity: str  # 'critical' or 'warning'
    title: str
    description: str
    cta: dict = field(default_factory=dict)


@dataclass
class DataQualityReport:
    """Complete data quality assessment for a household."""
    confidence_level: str  # 'high', 'medium', 'low'
    confidence_score: float
    missing: list[DataQualityItem] = field(default_factory=list)
    warnings: list[DataQualityItem] = field(default_factory=list)


class DataQualityService:
    """
    Assesses data completeness and model confidence for a household.

    Scoring:
    - Start at 1.0
    - Deduct weighted penalties for missing data
    - Clamp to 0..1 range

    Confidence levels:
    - >= 0.85: high
    - >= 0.60: medium
    - < 0.60: low
    """

    # Scoring penalties (from TASK-13 spec)
    PENALTY_NO_INCOME = Decimal('0.35')
    PENALTY_NO_EXPENSES = Decimal('0.25')
    PENALTY_NO_LIQUID_ASSETS = Decimal('0.25')
    PENALTY_STALE_BALANCES = Decimal('0.15')

    # Staleness threshold in days
    STALE_THRESHOLD_DAYS = 30

    def __init__(self, household):
        self.household = household

    def build_report(self) -> DataQualityReport:
        """Build the complete data quality report."""
        score = Decimal('1.0')
        missing = []
        warnings = []

        # Check for accounts
        accounts_data = self._check_accounts()
        if accounts_data.get('missing'):
            missing.append(accounts_data['missing'])
            score -= self.PENALTY_NO_LIQUID_ASSETS

        # Check for income sources
        income_data = self._check_income_sources()
        if income_data.get('missing'):
            missing.append(income_data['missing'])
            score -= self.PENALTY_NO_INCOME

        # Check for recurring expenses
        expense_data = self._check_recurring_expenses()
        if expense_data.get('missing'):
            missing.append(expense_data['missing'])
            score -= self.PENALTY_NO_EXPENSES

        # Check balance staleness
        stale_data = self._check_stale_balances()
        if stale_data.get('warning'):
            warnings.append(stale_data['warning'])
            score -= self.PENALTY_STALE_BALANCES

        # Check debt payments if liabilities exist
        debt_data = self._check_debt_payments()
        if debt_data.get('warning'):
            warnings.append(debt_data['warning'])

        # Clamp score to 0..1
        score = max(Decimal('0'), min(Decimal('1'), score))

        # Determine confidence level
        if score >= Decimal('0.85'):
            confidence_level = 'high'
        elif score >= Decimal('0.60'):
            confidence_level = 'medium'
        else:
            confidence_level = 'low'

        return DataQualityReport(
            confidence_level=confidence_level,
            confidence_score=float(score),
            missing=missing,
            warnings=warnings,
        )

    def _check_accounts(self) -> dict:
        """Check if household has any accounts."""
        from apps.accounts.models import Account, LIQUID_TYPES

        has_accounts = Account.objects.filter(
            household=self.household,
            is_active=True
        ).exists()

        if not has_accounts:
            return {
                'missing': DataQualityItem(
                    key='no_accounts',
                    severity='critical',
                    title='No accounts configured',
                    description='Add at least one account to track your net worth and enable forecasting.',
                    cta={'label': 'Add account', 'route': '/accounts'}
                )
            }

        # Check for liquid assets specifically
        has_liquid = Account.objects.filter(
            household=self.household,
            is_active=True,
            account_type__in=LIQUID_TYPES
        ).exists()

        if not has_liquid:
            return {
                'missing': DataQualityItem(
                    key='no_liquid_assets',
                    severity='critical',
                    title='No liquid assets',
                    description='Add checking, savings, or brokerage accounts to calculate liquidity metrics.',
                    cta={'label': 'Add account', 'route': '/accounts'}
                )
            }

        return {}

    def _check_income_sources(self) -> dict:
        """Check if household has income sources configured."""
        from apps.taxes.models import IncomeSource

        has_income = IncomeSource.objects.filter(
            household=self.household,
            is_active=True
        ).exists()

        if not has_income:
            return {
                'missing': DataQualityItem(
                    key='no_income_sources',
                    severity='critical',
                    title='No income sources',
                    description='Add at least one income source so forecasts can compute taxes and cash flow accurately.',
                    cta={'label': 'Add income', 'route': '/settings/income'}
                )
            }

        return {}

    def _check_recurring_expenses(self) -> dict:
        """Check if household has recurring expenses configured."""
        from apps.flows.models import RecurringFlow

        has_expenses = RecurringFlow.objects.filter(
            household=self.household,
            flow_type='expense',
            is_active=True
        ).exists()

        if not has_expenses:
            return {
                'missing': DataQualityItem(
                    key='no_recurring_expenses',
                    severity='warning',
                    title='No recurring expenses',
                    description='Add recurring expenses for more accurate cash flow projections.',
                    cta={'label': 'Add expense', 'route': '/flows'}
                )
            }

        return {}

    def _check_stale_balances(self) -> dict:
        """Check if account balances are stale (>30 days old)."""
        from apps.accounts.models import BalanceSnapshot

        cutoff_date = timezone.now().date() - timedelta(days=self.STALE_THRESHOLD_DAYS)

        latest_snapshot = BalanceSnapshot.objects.filter(
            account__household=self.household,
            account__is_active=True
        ).order_by('-as_of_date').first()

        if latest_snapshot and latest_snapshot.as_of_date < cutoff_date:
            days_old = (timezone.now().date() - latest_snapshot.as_of_date).days
            return {
                'warning': DataQualityItem(
                    key='stale_balances',
                    severity='warning',
                    title='Account balances are stale',
                    description=f'Your latest account snapshot is {days_old} days old.',
                    cta={'label': 'Update balances', 'route': '/accounts'}
                )
            }

        return {}

    def _check_debt_payments(self) -> dict:
        """Check if debt accounts have associated payment flows."""
        from apps.accounts.models import Account, LIABILITY_TYPES
        from apps.flows.models import RecurringFlow

        # Get all active liability accounts, excluding those in forbearance
        liability_accounts = Account.objects.filter(
            household=self.household,
            is_active=True,
            account_type__in=LIABILITY_TYPES
        ).select_related('liability_details')

        if not liability_accounts.exists():
            return {}

        # Check each liability account individually for associated payment flows
        accounts_without_flows = []
        for account in liability_accounts:
            # Skip accounts in forbearance
            if hasattr(account, 'liability_details') and account.liability_details.in_forbearance:
                continue

            # Check if this specific account has any recurring flows
            has_flow = RecurringFlow.objects.filter(
                household=self.household,
                is_active=True,
                linked_account=account
            ).exists()

            if not has_flow:
                accounts_without_flows.append(account.name)

        # Return warning if any accounts are missing flows
        if accounts_without_flows:
            if len(accounts_without_flows) == 1:
                description = f'The liability account "{accounts_without_flows[0]}" is missing a recurring payment flow.'
            else:
                account_list = ', '.join(f'"{name}"' for name in accounts_without_flows[:-1])
                description = f'The following liability accounts are missing recurring payment flows: {account_list} and "{accounts_without_flows[-1]}".'

            return {
                'warning': DataQualityItem(
                    key='missing_debt_payments',
                    severity='warning',
                    title='Debt accounts without payment flows',
                    description=description,
                    cta={'label': 'Configure payments', 'route': '/flows'}
                )
            }

        return {}
