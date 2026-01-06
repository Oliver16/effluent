from dataclasses import dataclass, field
from decimal import Decimal
from datetime import date
from dateutil.relativedelta import relativedelta
from django.db import transaction

from apps.core.models import Household
from apps.accounts.models import Account, ASSET_TYPES, LIABILITY_TYPES, LIQUID_TYPES, RETIREMENT_TYPES
from apps.flows.models import RecurringFlow, FlowType, FREQUENCY_TO_MONTHLY
from apps.taxes.models import PreTaxDeduction, IncomeSource
from .models import Scenario, ScenarioChange, ScenarioProjection, ChangeType


@dataclass
class AssetInfo:
    """Information about an asset account."""
    balance: Decimal
    account_type: str
    is_liquid: bool = False
    is_retirement: bool = False
    name: str = ""


@dataclass
class LiabilityInfo:
    """Information about a liability account."""
    balance: Decimal
    account_type: str
    rate: Decimal = Decimal('0')
    payment: Decimal = Decimal('0')
    term_months: int = 0
    name: str = ""


@dataclass
class MonthlyState:
    """State at a point in time."""
    date: date
    month: int
    assets: dict  # account_id -> AssetInfo
    liabilities: dict  # account_id -> LiabilityInfo
    incomes: list  # active flows
    expenses: list  # active flows
    transfers: list = field(default_factory=list)  # transfer flows (move money between accounts)
    contribution_rates: dict = field(default_factory=dict)  # 401k, HSA percentages
    applied_changes: set = field(default_factory=set)  # Track one-time changes applied

    @property
    def total_assets(self) -> Decimal:
        return sum(a.balance for a in self.assets.values()) if self.assets else Decimal('0')

    @property
    def total_liabilities(self) -> Decimal:
        return sum(l.balance for l in self.liabilities.values()) if self.liabilities else Decimal('0')

    @property
    def liquid_assets(self) -> Decimal:
        return sum(a.balance for a in self.assets.values() if a.is_liquid) if self.assets else Decimal('0')

    @property
    def retirement_assets(self) -> Decimal:
        return sum(a.balance for a in self.assets.values() if a.is_retirement) if self.assets else Decimal('0')

    @property
    def net_worth(self) -> Decimal:
        return self.total_assets - self.total_liabilities

    @property
    def total_income(self) -> Decimal:
        return sum(f['monthly'] for f in self.incomes) if self.incomes else Decimal('0')

    @property
    def total_expenses(self) -> Decimal:
        return sum(f['monthly'] for f in self.expenses) if self.expenses else Decimal('0')

    @property
    def net_cash_flow(self) -> Decimal:
        return self.total_income - self.total_expenses

    def get_asset_breakdown(self) -> dict:
        """Return assets grouped by type."""
        breakdown = {}
        for aid, asset in self.assets.items():
            key = asset.account_type or 'other'
            if key not in breakdown:
                breakdown[key] = Decimal('0')
            breakdown[key] += asset.balance
        return {k: str(v.quantize(Decimal('0.01'))) for k, v in breakdown.items()}

    def get_liability_breakdown(self) -> dict:
        """Return liabilities grouped by type."""
        breakdown = {}
        for lid, liab in self.liabilities.items():
            key = liab.account_type or 'other'
            if key not in breakdown:
                breakdown[key] = Decimal('0')
            breakdown[key] += liab.balance
        return {k: str(v.quantize(Decimal('0.01'))) for k, v in breakdown.items()}


class ScenarioEngine:
    """Projects financial state over time with scenario changes."""

    def __init__(self, scenario: Scenario):
        self.scenario = scenario
        self.household = scenario.household

    def _get_all_changes(self) -> list[ScenarioChange]:
        """Get all changes including inherited from parent scenarios."""
        changes = []

        # Walk up the parent chain to collect inherited changes
        parent = self.scenario.parent_scenario
        while parent:
            parent_changes = list(parent.changes.filter(is_enabled=True))
            changes.extend(parent_changes)
            parent = parent.parent_scenario

        # Add this scenario's changes (they take precedence)
        changes.extend(list(self.scenario.changes.filter(is_enabled=True)))

        # Sort by date
        changes.sort(key=lambda c: c.effective_date)
        return changes

    def compute_projection(self) -> list[ScenarioProjection]:
        """Compute full projection and save to database."""
        # Initialize from current state
        state = self._initialize_state()

        # Get scenario changes sorted by date, including inherited changes from parent
        changes = self._get_all_changes()

        projections = []

        for month in range(self.scenario.projection_months):
            current_date = self.scenario.start_date + relativedelta(months=month)

            # Apply any changes that take effect this month
            for change in changes:
                if change.effective_date <= current_date:
                    if not change.end_date or change.end_date >= current_date:
                        state = self._apply_change(state, change, current_date)

            # Apply growth rates
            state = self._apply_growth(state, month)

            # Compute this month's projection
            proj = self._create_projection(state, current_date, month)
            projections.append(proj)

            # Advance state (apply cash flow to liquid assets)
            state = self._advance_month(state)

        # Save projections
        with transaction.atomic():
            ScenarioProjection.objects.filter(scenario=self.scenario).delete()
            ScenarioProjection.objects.bulk_create(projections)

        return projections

    def _initialize_state(self) -> MonthlyState:
        """Initialize state from current household data."""
        assets = {}
        liabilities = {}

        for acct in Account.objects.filter(household=self.household, is_active=True):
            snap = acct.latest_snapshot
            if snap:
                if acct.is_asset:
                    assets[str(acct.id)] = AssetInfo(
                        balance=snap.market_value or snap.balance,
                        account_type=acct.account_type,
                        is_liquid=acct.is_liquid,
                        is_retirement=acct.account_type in RETIREMENT_TYPES,
                        name=acct.name,
                    )
                else:
                    # Try to get rate from liability details
                    rate = Decimal('0')
                    payment = Decimal('0')
                    term = 0
                    if hasattr(acct, 'liability_details') and acct.liability_details:
                        details = acct.liability_details
                        rate = details.interest_rate or Decimal('0')
                        payment = details.minimum_payment or Decimal('0')
                        term = details.term_months or 0

                    liabilities[str(acct.id)] = LiabilityInfo(
                        balance=abs(snap.balance),
                        account_type=acct.account_type,
                        rate=rate,
                        payment=payment,
                        term_months=term,
                        name=acct.name,
                    )

        incomes = []
        expenses = []
        transfers = []

        # Only use baseline flows for projection (scenario-specific flows are added via changes)
        for flow in RecurringFlow.objects.filter(household=self.household, is_active=True, is_baseline=True):
            f = {
                'id': str(flow.id),
                'name': flow.name,
                'category': flow.category,
                'amount': flow.amount,
                'frequency': flow.frequency,
                'monthly': flow.monthly_amount,
                'linked_account': str(flow.linked_account_id) if flow.linked_account_id else None,
            }
            if flow.flow_type == FlowType.INCOME:
                incomes.append(f)
            elif flow.flow_type == FlowType.EXPENSE:
                expenses.append(f)
            elif flow.flow_type == FlowType.TRANSFER:
                transfers.append(f)

        # Initialize contribution rates from pre-tax deductions
        contribution_rates = {'401k': Decimal('0'), 'hsa': Decimal('0')}
        # Safely query deductions - query may fail if no income sources exist
        deductions = PreTaxDeduction.objects.filter(
            income_source__household=self.household,
            is_active=True
        )
        for deduction in deductions:
            if deduction.deduction_type in ('traditional_401k', 'roth_401k'):
                if deduction.amount_type == 'percentage':
                    contribution_rates['401k'] = deduction.amount
            elif deduction.deduction_type == 'hsa':
                if deduction.amount_type == 'percentage':
                    contribution_rates['hsa'] = deduction.amount

        return MonthlyState(
            date=self.scenario.start_date,
            month=0,
            assets=assets,
            liabilities=liabilities,
            incomes=incomes,
            expenses=expenses,
            transfers=transfers,
            contribution_rates=contribution_rates,
            applied_changes=set(),
        )

    def _apply_change(self, state: MonthlyState, change: ScenarioChange, current_date: date) -> MonthlyState:
        """Apply a scenario change to the state."""
        params = change.parameters
        change_key = str(change.id)

        # Check if this is a one-time change that was already applied
        one_time_types = {ChangeType.LUMP_SUM_INCOME, ChangeType.LUMP_SUM_EXPENSE}
        if change.change_type in one_time_types:
            if change_key in state.applied_changes:
                return state
            state.applied_changes.add(change_key)

        if change.change_type == ChangeType.ADD_INCOME:
            state.incomes.append({
                'id': f'scenario_{change.id}',
                'name': change.name,
                'category': params.get('category', 'other_income'),
                'amount': Decimal(str(params.get('amount', 0))),
                'frequency': params.get('frequency', 'monthly'),
                'monthly': self._to_monthly(params.get('amount', 0), params.get('frequency', 'monthly')),
            })

        elif change.change_type == ChangeType.MODIFY_INCOME:
            # Modify existing income flow
            flow_id = str(change.source_flow_id) if change.source_flow_id else params.get('source_flow_id')
            for income in state.incomes:
                if income['id'] == flow_id:
                    if 'amount' in params:
                        income['amount'] = Decimal(str(params['amount']))
                        freq = params.get('frequency', income['frequency'])
                        income['frequency'] = freq
                        income['monthly'] = self._to_monthly(params['amount'], freq)
                    if 'category' in params:
                        income['category'] = params['category']
                    break

        elif change.change_type == ChangeType.REMOVE_INCOME:
            flow_id = str(change.source_flow_id) if change.source_flow_id else params.get('source_flow_id')
            state.incomes = [i for i in state.incomes if i['id'] != flow_id]

        elif change.change_type == ChangeType.ADD_EXPENSE:
            state.expenses.append({
                'id': f'scenario_{change.id}',
                'name': change.name,
                'category': params.get('category', 'miscellaneous'),
                'amount': Decimal(str(params.get('amount', 0))),
                'frequency': params.get('frequency', 'monthly'),
                'monthly': self._to_monthly(params.get('amount', 0), params.get('frequency', 'monthly')),
            })

        elif change.change_type == ChangeType.MODIFY_EXPENSE:
            # Modify existing expense flow
            flow_id = str(change.source_flow_id) if change.source_flow_id else params.get('source_flow_id')
            for expense in state.expenses:
                if expense['id'] == flow_id:
                    if 'amount' in params:
                        expense['amount'] = Decimal(str(params['amount']))
                        freq = params.get('frequency', expense['frequency'])
                        expense['frequency'] = freq
                        expense['monthly'] = self._to_monthly(params['amount'], freq)
                    if 'category' in params:
                        expense['category'] = params['category']
                    break

        elif change.change_type == ChangeType.REMOVE_EXPENSE:
            flow_id = str(change.source_flow_id) if change.source_flow_id else params.get('source_flow_id')
            state.expenses = [e for e in state.expenses if e['id'] != flow_id]

        elif change.change_type == ChangeType.ADD_DEBT:
            debt_id = f'scenario_debt_{change.id}'
            principal = Decimal(str(params.get('principal', 0)))
            rate = Decimal(str(params.get('rate', 0)))
            payment = Decimal(str(params.get('payment', 0)))
            term = int(params.get('term_months', 0))

            state.liabilities[debt_id] = LiabilityInfo(
                balance=principal,
                account_type='personal_loan',
                rate=rate,
                payment=payment,
                term_months=term,
                name=change.name,
            )
            # Add payment as expense
            state.expenses.append({
                'id': f'payment_{debt_id}',
                'name': f'{change.name} Payment',
                'category': 'other_debt',
                'amount': payment,
                'frequency': 'monthly',
                'monthly': payment,
            })

        elif change.change_type == ChangeType.MODIFY_DEBT:
            # Modify existing debt parameters
            debt_id = str(change.source_account_id) if change.source_account_id else params.get('source_account_id')
            if debt_id in state.liabilities:
                liab = state.liabilities[debt_id]
                if 'principal' in params:
                    liab.balance = Decimal(str(params['principal']))
                if 'rate' in params:
                    liab.rate = Decimal(str(params['rate']))
                if 'term_months' in params:
                    liab.term_months = int(params['term_months'])
                if 'payment' in params:
                    new_payment = Decimal(str(params['payment']))
                    liab.payment = new_payment
                    # Update the payment expense
                    for exp in state.expenses:
                        if exp['id'] == f'payment_{debt_id}' or debt_id in exp.get('id', ''):
                            exp['amount'] = new_payment
                            exp['monthly'] = new_payment
                            break

        elif change.change_type == ChangeType.PAYOFF_DEBT:
            # Add extra payment to existing debt
            debt_id = str(change.source_account_id) if change.source_account_id else params.get('source_account_id')
            extra = Decimal(str(params.get('extra_monthly', 0)))
            state.expenses.append({
                'id': f'extra_{debt_id}_{change.id}',
                'name': f'{change.name} Extra Payment',
                'category': 'other_debt',
                'amount': extra,
                'frequency': 'monthly',
                'monthly': extra,
            })

        elif change.change_type == ChangeType.REFINANCE:
            # Refinance existing debt with new terms
            debt_id = str(change.source_account_id) if change.source_account_id else params.get('source_account_id')
            if debt_id in state.liabilities:
                liab = state.liabilities[debt_id]
                old_balance = liab.balance

                # Apply closing costs (add to balance)
                closing_costs = Decimal(str(params.get('closing_costs', 0)))
                new_balance = old_balance + closing_costs

                # Update rate and term
                new_rate = Decimal(str(params.get('rate', liab.rate)))
                new_term = int(params.get('term_months', liab.term_months))

                # Calculate new payment using amortization formula
                if new_rate > 0 and new_term > 0:
                    monthly_rate = new_rate / 12
                    new_payment = new_balance * (monthly_rate * (1 + monthly_rate) ** new_term) / ((1 + monthly_rate) ** new_term - 1)
                else:
                    new_payment = new_balance / new_term if new_term > 0 else Decimal('0')

                liab.balance = new_balance
                liab.rate = new_rate
                liab.term_months = new_term
                liab.payment = new_payment.quantize(Decimal('0.01'))

                # Update/replace the payment expense
                old_payment_found = False
                for exp in state.expenses:
                    if debt_id in exp.get('id', ''):
                        exp['amount'] = liab.payment
                        exp['monthly'] = liab.payment
                        exp['name'] = f'{liab.name} (Refinanced)'
                        old_payment_found = True
                        break

                if not old_payment_found:
                    state.expenses.append({
                        'id': f'refi_payment_{debt_id}',
                        'name': f'{liab.name} Payment (Refinanced)',
                        'category': 'other_debt',
                        'amount': liab.payment,
                        'frequency': 'monthly',
                        'monthly': liab.payment,
                    })

        elif change.change_type == ChangeType.ADD_ASSET:
            asset_id = f'scenario_asset_{change.id}'
            value = Decimal(str(params.get('value', params.get('amount', 0))))
            asset_type = params.get('account_type', 'other_asset')

            state.assets[asset_id] = AssetInfo(
                balance=value,
                account_type=asset_type,
                is_liquid=asset_type in LIQUID_TYPES if hasattr(LIQUID_TYPES, '__contains__') else False,
                is_retirement=asset_type in RETIREMENT_TYPES if hasattr(RETIREMENT_TYPES, '__contains__') else False,
                name=change.name,
            )

        elif change.change_type == ChangeType.MODIFY_ASSET:
            # Modify existing asset value
            asset_id = str(change.source_account_id) if change.source_account_id else params.get('source_account_id')
            if asset_id in state.assets:
                if 'value' in params:
                    state.assets[asset_id].balance = Decimal(str(params['value']))
                elif 'amount' in params:
                    state.assets[asset_id].balance = Decimal(str(params['amount']))

        elif change.change_type == ChangeType.SELL_ASSET:
            # Sell asset and add proceeds to liquid assets
            asset_id = str(change.source_account_id) if change.source_account_id else params.get('source_account_id')
            if asset_id in state.assets:
                sale_price = Decimal(str(params.get('sale_price', state.assets[asset_id].balance)))
                selling_costs = Decimal(str(params.get('selling_costs', 0)))
                net_proceeds = sale_price - selling_costs

                # Remove the asset
                del state.assets[asset_id]

                # Add proceeds to first liquid asset or create new cash
                liquid_asset = next((k for k, a in state.assets.items() if a.is_liquid), None)
                if liquid_asset:
                    state.assets[liquid_asset].balance += net_proceeds
                else:
                    state.assets[f'sale_proceeds_{change.id}'] = AssetInfo(
                        balance=net_proceeds,
                        account_type='cash',
                        is_liquid=True,
                        is_retirement=False,
                        name='Sale Proceeds',
                    )

        elif change.change_type == ChangeType.LUMP_SUM_INCOME:
            # One-time: add to liquid assets
            amount = Decimal(str(params.get('amount', 0)))
            liquid_asset = next((k for k, a in state.assets.items() if a.is_liquid), None)
            if liquid_asset:
                state.assets[liquid_asset].balance += amount
            elif state.assets:
                first_key = next(iter(state.assets.keys()))
                state.assets[first_key].balance += amount

        elif change.change_type == ChangeType.LUMP_SUM_EXPENSE:
            # One-time: subtract from liquid assets
            amount = Decimal(str(params.get('amount', 0)))
            liquid_asset = next((k for k, a in state.assets.items() if a.is_liquid), None)
            if liquid_asset:
                state.assets[liquid_asset].balance = max(Decimal('0'), state.assets[liquid_asset].balance - amount)
            elif state.assets:
                first_key = next(iter(state.assets.keys()))
                state.assets[first_key].balance = max(Decimal('0'), state.assets[first_key].balance - amount)

        elif change.change_type == ChangeType.MODIFY_401K:
            # Change 401(k) contribution rate
            new_percentage = Decimal(str(params.get('percentage', 0)))
            new_rate = new_percentage / 100  # Convert to decimal
            state.contribution_rates['401k'] = new_rate

            # Calculate contribution amount from gross salary income
            for inc in state.incomes:
                if inc['category'] in ('salary', 'hourly_wages'):
                    gross_monthly = inc['monthly']
                    new_contribution = gross_monthly * new_rate

                    # Add 401(k) contribution as expense (reduces take-home pay)
                    # But also add to retirement assets
                    existing_expense = next(
                        (e for e in state.expenses if '401k_contribution' in e.get('id', '')),
                        None
                    )
                    if existing_expense:
                        existing_expense['monthly'] = new_contribution
                        existing_expense['amount'] = new_contribution
                    elif new_contribution > 0:
                        state.expenses.append({
                            'id': f'401k_contribution_{change.id}',
                            'name': f'{change.name} - 401(k) Contribution',
                            'category': 'retirement_contribution',
                            'amount': new_contribution,
                            'frequency': 'monthly',
                            'monthly': new_contribution,
                        })

                    # Add transfer to retirement account
                    retirement_acct = next(
                        (k for k, a in state.assets.items() if a.is_retirement),
                        None
                    )
                    if retirement_acct and new_contribution > 0:
                        existing_transfer = next(
                            (t for t in state.transfers if '401k_transfer' in t.get('id', '')),
                            None
                        )
                        if existing_transfer:
                            existing_transfer['monthly'] = new_contribution
                            existing_transfer['amount'] = new_contribution
                        else:
                            state.transfers.append({
                                'id': f'401k_transfer_{change.id}',
                                'name': '401(k) Contribution',
                                'category': 'retirement_transfer',
                                'amount': new_contribution,
                                'frequency': 'monthly',
                                'monthly': new_contribution,
                                'linked_account': retirement_acct,
                            })
                    break

        elif change.change_type == ChangeType.MODIFY_HSA:
            # Change HSA contribution rate
            new_percentage = Decimal(str(params.get('percentage', 0)))
            new_rate = new_percentage / 100  # Convert to decimal
            state.contribution_rates['hsa'] = new_rate

            # Calculate HSA contribution amount from gross salary income
            for inc in state.incomes:
                if inc['category'] in ('salary', 'hourly_wages'):
                    gross_monthly = inc['monthly']
                    new_contribution = gross_monthly * new_rate

                    # Add HSA contribution as expense (reduces take-home pay)
                    existing_expense = next(
                        (e for e in state.expenses if 'hsa_contribution' in e.get('id', '')),
                        None
                    )
                    if existing_expense:
                        existing_expense['monthly'] = new_contribution
                        existing_expense['amount'] = new_contribution
                    elif new_contribution > 0:
                        state.expenses.append({
                            'id': f'hsa_contribution_{change.id}',
                            'name': f'{change.name} - HSA Contribution',
                            'category': 'health_savings',
                            'amount': new_contribution,
                            'frequency': 'monthly',
                            'monthly': new_contribution,
                        })
                    break

        return state

    def _apply_growth(self, state: MonthlyState, month: int) -> MonthlyState:
        """Apply annual growth rates (pro-rated monthly)."""
        if month > 0 and month % 12 == 0:
            # Annual salary growth
            growth = 1 + float(self.scenario.salary_growth_rate)
            for inc in state.incomes:
                if inc['category'] in ('salary', 'hourly_wages', 'bonus', 'commission'):
                    inc['amount'] = inc['amount'] * Decimal(str(growth))
                    inc['monthly'] = inc['monthly'] * Decimal(str(growth))

            # Annual inflation on expenses (excluding debt payments)
            inflation = 1 + float(self.scenario.inflation_rate)
            for exp in state.expenses:
                # Don't inflate fixed debt payments
                if not any(x in exp['category'] for x in ('debt', 'mortgage', 'loan')):
                    exp['amount'] = exp['amount'] * Decimal(str(inflation))
                    exp['monthly'] = exp['monthly'] * Decimal(str(inflation))

        # Monthly investment returns (apply to investment and retirement accounts)
        monthly_return = (1 + float(self.scenario.investment_return_rate)) ** (1/12) - 1
        for aid, asset in state.assets.items():
            # Apply returns only to investment-type accounts (not liquid cash)
            if asset.is_retirement or asset.account_type in ('brokerage', 'crypto'):
                asset.balance = asset.balance * Decimal(str(1 + monthly_return))

        return state

    def _advance_month(self, state: MonthlyState) -> MonthlyState:
        """Apply monthly cash flow to assets/liabilities."""
        net_flow = state.net_cash_flow

        # Add net cash flow to first liquid asset
        liquid_asset = next((k for k, a in state.assets.items() if a.is_liquid), None)
        if liquid_asset:
            state.assets[liquid_asset].balance = max(Decimal('0'), state.assets[liquid_asset].balance + net_flow)
        elif state.assets:
            first_key = next(iter(state.assets.keys()))
            state.assets[first_key].balance = max(Decimal('0'), state.assets[first_key].balance + net_flow)

        # Process transfers (move money between accounts)
        for transfer in state.transfers:
            amount = transfer['monthly']
            target_id = transfer.get('linked_account')
            if target_id and target_id in state.assets:
                # Transfer from liquid assets to target account
                if liquid_asset:
                    state.assets[liquid_asset].balance = max(Decimal('0'), state.assets[liquid_asset].balance - amount)
                state.assets[target_id].balance += amount
            elif target_id and target_id in state.liabilities:
                # Extra payment to liability
                if liquid_asset:
                    state.assets[liquid_asset].balance = max(Decimal('0'), state.assets[liquid_asset].balance - amount)
                state.liabilities[target_id].balance = max(Decimal('0'), state.liabilities[target_id].balance - amount)

        # Reduce debt balances based on payments
        for lid, liab in list(state.liabilities.items()):
            if liab.balance > 0 and liab.payment > 0:
                # Calculate interest for this month
                monthly_interest = liab.balance * (liab.rate / 12) if liab.rate > 0 else Decimal('0')
                principal_payment = liab.payment - monthly_interest

                # Find any extra payments for this debt
                extra_payment = sum(
                    e['monthly'] for e in state.expenses
                    if 'extra' in e.get('id', '') and lid in e.get('id', '')
                )
                principal_payment += extra_payment

                # Reduce balance
                liab.balance = max(Decimal('0'), liab.balance - principal_payment)

                # If paid off, remove the payment expense
                if liab.balance == 0:
                    state.expenses = [
                        e for e in state.expenses
                        if lid not in e.get('id', '')
                    ]

        state.month += 1
        state.date = state.date + relativedelta(months=1)

        return state

    def _create_projection(self, state: MonthlyState, proj_date: date, month: int) -> ScenarioProjection:
        """Create projection record from state."""
        total_exp = state.total_expenses
        debt_categories = ('debt', 'mortgage', 'loan', 'credit_card', 'heloc')
        debt_service = sum(
            e['monthly'] for e in state.expenses
            if any(cat in e.get('category', '') for cat in debt_categories)
        )

        non_debt_exp = total_exp - debt_service
        operating_income = state.total_income - non_debt_exp
        dscr = operating_income / debt_service if debt_service > 0 else Decimal('999')

        savings_rate = state.net_cash_flow / state.total_income if state.total_income > 0 else Decimal('0')
        liquidity = state.liquid_assets / total_exp if total_exp > 0 else Decimal('999')

        return ScenarioProjection(
            scenario=self.scenario,
            projection_date=proj_date,
            month_number=month,
            total_assets=state.total_assets.quantize(Decimal('0.01')),
            total_liabilities=state.total_liabilities.quantize(Decimal('0.01')),
            net_worth=state.net_worth.quantize(Decimal('0.01')),
            liquid_assets=state.liquid_assets.quantize(Decimal('0.01')),
            retirement_assets=state.retirement_assets.quantize(Decimal('0.01')),
            total_income=state.total_income.quantize(Decimal('0.01')),
            total_expenses=total_exp.quantize(Decimal('0.01')),
            net_cash_flow=state.net_cash_flow.quantize(Decimal('0.01')),
            dscr=min(dscr, Decimal('999')).quantize(Decimal('0.001')),
            savings_rate=savings_rate.quantize(Decimal('0.0001')),
            liquidity_months=min(liquidity, Decimal('999')).quantize(Decimal('0.01')),
            income_breakdown={i['category']: str(i['monthly'].quantize(Decimal('0.01'))) for i in state.incomes},
            expense_breakdown={e['category']: str(e['monthly'].quantize(Decimal('0.01'))) for e in state.expenses},
            asset_breakdown=state.get_asset_breakdown(),
            liability_breakdown=state.get_liability_breakdown(),
        )

    def _to_monthly(self, amount, frequency: str) -> Decimal:
        """Convert amount to monthly."""
        mult = FREQUENCY_TO_MONTHLY.get(frequency, Decimal('1'))
        return Decimal(str(amount)) * mult
