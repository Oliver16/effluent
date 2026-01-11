import pytest
from decimal import Decimal
from datetime import date

from apps.accounts.models import Account, AccountType, BalanceSnapshot, LiabilityDetails
from apps.flows.models import RecurringFlow, FlowType, ExpenseCategory
from apps.flows.services import SystemFlowGenerator


@pytest.fixture
def checking_account(household):
    """Create a checking account for payment flows."""
    account = Account.objects.create(
        household=household,
        name='Main Checking',
        account_type=AccountType.CHECKING,
        institution='Test Bank'
    )
    BalanceSnapshot.objects.create(
        account=account,
        as_of_date=date.today(),
        balance=Decimal('5000.00')
    )
    return account


@pytest.mark.django_db
class TestCalculateAmortizedPayment:
    """Tests for the _calculate_amortized_payment method."""

    def test_calculate_payment_with_interest(self, household, checking_account):
        """Test standard amortization formula with interest."""
        # Create a student loan: $30,000 at 6.8% for 120 months (10 years)
        # Expected monthly payment ≈ $345.24
        loan = Account.objects.create(
            household=household,
            name='Federal Student Loan',
            account_type=AccountType.STUDENT_LOAN_FEDERAL,
            institution='Fed Loan'
        )
        BalanceSnapshot.objects.create(
            account=loan,
            as_of_date=date.today(),
            balance=Decimal('30000.00')
        )
        details = LiabilityDetails.objects.create(
            account=loan,
            interest_rate=Decimal('0.068'),  # 6.8%
            term_months=120
        )

        generator = SystemFlowGenerator(household)
        payment = generator._calculate_amortized_payment(loan, details)

        # Standard amortization: M = P × [r(1+r)^n] / [(1+r)^n - 1]
        # For $30k at 6.8% over 120 months ≈ $345.24
        assert payment == Decimal('345.24')

    def test_calculate_payment_zero_interest(self, household, checking_account):
        """Test payment calculation with 0% interest (simple division)."""
        # $12,000 over 48 months at 0% = $250/month
        loan = Account.objects.create(
            household=household,
            name='Family Loan',
            account_type=AccountType.FAMILY_LOAN,
            institution='Family'
        )
        BalanceSnapshot.objects.create(
            account=loan,
            as_of_date=date.today(),
            balance=Decimal('12000.00')
        )
        details = LiabilityDetails.objects.create(
            account=loan,
            interest_rate=Decimal('0'),
            term_months=48
        )

        generator = SystemFlowGenerator(household)
        payment = generator._calculate_amortized_payment(loan, details)

        assert payment == Decimal('250.00')

    def test_calculate_payment_no_balance(self, household, checking_account):
        """Test that payment is 0 when balance is 0."""
        loan = Account.objects.create(
            household=household,
            name='Paid Off Loan',
            account_type=AccountType.AUTO_LOAN,
            institution='Auto Finance'
        )
        # No snapshot means balance is 0
        details = LiabilityDetails.objects.create(
            account=loan,
            interest_rate=Decimal('0.05'),
            term_months=60
        )

        generator = SystemFlowGenerator(household)
        payment = generator._calculate_amortized_payment(loan, details)

        assert payment == Decimal('0')

    def test_calculate_payment_no_term(self, household, checking_account):
        """Test that payment is 0 when term is not specified."""
        loan = Account.objects.create(
            household=household,
            name='No Term Loan',
            account_type=AccountType.PERSONAL_LOAN,
            institution='Lender'
        )
        BalanceSnapshot.objects.create(
            account=loan,
            as_of_date=date.today(),
            balance=Decimal('5000.00')
        )
        details = LiabilityDetails.objects.create(
            account=loan,
            interest_rate=Decimal('0.10'),
            term_months=None  # No term specified
        )

        generator = SystemFlowGenerator(household)
        payment = generator._calculate_amortized_payment(loan, details)

        assert payment == Decimal('0')


@pytest.mark.django_db
class TestGenerateLiabilityPaymentFlows:
    """Tests for generating liability payment flows."""

    def test_uses_minimum_payment_when_specified(self, household, checking_account):
        """Test that specified minimum_payment is used directly."""
        loan = Account.objects.create(
            household=household,
            name='Auto Loan',
            account_type=AccountType.AUTO_LOAN,
            institution='Auto Finance'
        )
        BalanceSnapshot.objects.create(
            account=loan,
            as_of_date=date.today(),
            balance=Decimal('15000.00')
        )
        LiabilityDetails.objects.create(
            account=loan,
            interest_rate=Decimal('0.05'),
            term_months=60,
            minimum_payment=Decimal('300.00')  # Explicit payment
        )

        generator = SystemFlowGenerator(household)
        generator._generate_liability_payment_flows()

        flow = RecurringFlow.objects.get(linked_account=loan)
        assert flow.amount == Decimal('300.00')
        assert flow.flow_type == FlowType.EXPENSE
        assert flow.expense_category == ExpenseCategory.AUTO_LOAN

    def test_calculates_payment_when_not_specified(self, household, checking_account):
        """Test that payment is calculated from balance/rate/term when minimum_payment is not set."""
        loan = Account.objects.create(
            household=household,
            name='Student Loan',
            account_type=AccountType.STUDENT_LOAN_PRIVATE,
            institution='Private Lender'
        )
        BalanceSnapshot.objects.create(
            account=loan,
            as_of_date=date.today(),
            balance=Decimal('20000.00')
        )
        LiabilityDetails.objects.create(
            account=loan,
            interest_rate=Decimal('0.08'),  # 8%
            term_months=120,
            minimum_payment=None  # No payment specified - should calculate
        )

        generator = SystemFlowGenerator(household)
        generator._generate_liability_payment_flows()

        flow = RecurringFlow.objects.get(linked_account=loan)
        # $20k at 8% over 120 months ≈ $242.66
        assert flow.amount == Decimal('242.66')
        assert flow.expense_category == ExpenseCategory.STUDENT_LOAN

    def test_skips_revolving_debt_without_payment(self, household, checking_account):
        """Test that revolving debt without minimum_payment is skipped."""
        card = Account.objects.create(
            household=household,
            name='Credit Card',
            account_type=AccountType.CREDIT_CARD,
            institution='Credit Corp'
        )
        BalanceSnapshot.objects.create(
            account=card,
            as_of_date=date.today(),
            balance=Decimal('5000.00')
        )
        LiabilityDetails.objects.create(
            account=card,
            interest_rate=Decimal('0.22'),
            minimum_payment=None  # Revolving debt can't calculate from term
        )

        generator = SystemFlowGenerator(household)
        generator._generate_liability_payment_flows()

        # Should not create a flow for credit card without minimum payment
        assert not RecurringFlow.objects.filter(linked_account=card).exists()

    def test_creates_flow_for_revolving_with_minimum_payment(self, household, checking_account):
        """Test that revolving debt with minimum_payment creates a flow."""
        card = Account.objects.create(
            household=household,
            name='Credit Card',
            account_type=AccountType.CREDIT_CARD,
            institution='Credit Corp'
        )
        BalanceSnapshot.objects.create(
            account=card,
            as_of_date=date.today(),
            balance=Decimal('5000.00')
        )
        LiabilityDetails.objects.create(
            account=card,
            interest_rate=Decimal('0.22'),
            minimum_payment=Decimal('150.00')
        )

        generator = SystemFlowGenerator(household)
        generator._generate_liability_payment_flows()

        flow = RecurringFlow.objects.get(linked_account=card)
        assert flow.amount == Decimal('150.00')
        assert flow.expense_category == ExpenseCategory.CREDIT_CARD_PAYMENT

    def test_mortgage_payment_calculation(self, household, checking_account):
        """Test mortgage payment calculation without minimum_payment."""
        mortgage = Account.objects.create(
            household=household,
            name='Home Mortgage',
            account_type=AccountType.PRIMARY_MORTGAGE,
            institution='Home Lender'
        )
        BalanceSnapshot.objects.create(
            account=mortgage,
            as_of_date=date.today(),
            balance=Decimal('250000.00')
        )
        LiabilityDetails.objects.create(
            account=mortgage,
            interest_rate=Decimal('0.065'),  # 6.5%
            term_months=360,  # 30 years
            minimum_payment=None
        )

        generator = SystemFlowGenerator(household)
        generator._generate_liability_payment_flows()

        flow = RecurringFlow.objects.get(linked_account=mortgage)
        # $250k at 6.5% over 360 months ≈ $1580.17
        assert flow.amount == Decimal('1580.17')
        assert flow.expense_category == ExpenseCategory.MORTGAGE_PRINCIPAL
