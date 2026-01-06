"""
Data migration to add sample user and dataset for testing/troubleshooting.

Creates:
- Sample user (test@example.com / testpassword123)
- Sample household with completed onboarding
- Sample household members (primary + spouse)
- Sample accounts (checking, savings, retirement, credit card, mortgage, vehicle)
- Sample balance snapshots
- Sample income sources with withholding and deductions
- Sample recurring flows (income and expenses)
"""
import uuid
from decimal import Decimal
from django.db import migrations
from django.utils import timezone
from datetime import date, timedelta


def create_sample_data(apps, schema_editor):
    """Create sample user and comprehensive financial dataset."""
    # Get models
    User = apps.get_model('core', 'User')
    Household = apps.get_model('core', 'Household')
    HouseholdMember = apps.get_model('core', 'HouseholdMember')
    HouseholdMembership = apps.get_model('core', 'HouseholdMembership')
    UserSettings = apps.get_model('core', 'UserSettings')

    Account = apps.get_model('accounts', 'Account')
    BalanceSnapshot = apps.get_model('accounts', 'BalanceSnapshot')
    AssetGroup = apps.get_model('accounts', 'AssetGroup')
    LiabilityDetails = apps.get_model('accounts', 'LiabilityDetails')
    AssetDetails = apps.get_model('accounts', 'AssetDetails')

    IncomeSource = apps.get_model('taxes', 'IncomeSource')
    W2Withholding = apps.get_model('taxes', 'W2Withholding')
    PreTaxDeduction = apps.get_model('taxes', 'PreTaxDeduction')

    RecurringFlow = apps.get_model('flows', 'RecurringFlow')

    OnboardingProgress = apps.get_model('onboarding', 'OnboardingProgress')

    # Check if sample user already exists
    if User.objects.filter(email='test@example.com').exists():
        return

    today = date.today()

    # ===================
    # CREATE USER
    # ===================
    user = User.objects.create(
        id=uuid.uuid4(),
        email='test@example.com',
        username='testuser',
        first_name='Test',
        last_name='User',
        is_active=True,
        date_of_birth=date(1985, 6, 15),
    )
    # Set password using Django's built-in method
    user.set_password('testpassword123')
    user.save()

    # Create user settings
    UserSettings.objects.create(
        user=user,
        weekly_summary=True,
        insight_alerts=True,
        balance_reminders=True,
        critical_alerts=True,
        two_factor_enabled=False,
    )

    # ===================
    # CREATE HOUSEHOLD
    # ===================
    household = Household.objects.create(
        id=uuid.uuid4(),
        name='Sample Household',
        slug='sample-household',
        plan='free',
        subscription_status='trialing',
        currency='USD',
        fiscal_year_start_month=1,
        tax_filing_status='married_jointly',
        state_of_residence='CA',
        onboarding_completed=True,
        onboarding_current_step='complete',
    )

    # Create household membership
    HouseholdMembership.objects.create(
        id=uuid.uuid4(),
        user=user,
        household=household,
        role='owner',
        is_default=True,
    )

    # ===================
    # CREATE HOUSEHOLD MEMBERS
    # ===================
    primary_member = HouseholdMember.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='John Sample',
        relationship='self',
        date_of_birth=date(1985, 6, 15),
        is_primary=True,
        employment_status='employed_w2',
    )

    spouse_member = HouseholdMember.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Jane Sample',
        relationship='spouse',
        date_of_birth=date(1987, 3, 22),
        is_primary=False,
        employment_status='employed_w2',
    )

    child_member = HouseholdMember.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Junior Sample',
        relationship='child',
        date_of_birth=date(2018, 9, 10),
        is_primary=False,
        employment_status='student',
    )

    # ===================
    # CREATE ASSET GROUP (Home + Mortgage)
    # ===================
    home_asset_group = AssetGroup.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Primary Residence',
        description='Main home with associated mortgage',
    )

    # ===================
    # CREATE ACCOUNTS
    # ===================

    # -- CASH ACCOUNTS --
    checking = Account.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Primary Checking',
        account_type='checking',
        institution='Chase Bank',
        account_number_last4='4521',
        is_active=True,
        display_order=1,
        owner=primary_member,
    )
    BalanceSnapshot.objects.create(
        id=uuid.uuid4(),
        account=checking,
        as_of_date=today,
        balance=Decimal('8542.33'),
    )

    savings = Account.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Emergency Fund',
        account_type='savings',
        institution='Marcus by Goldman Sachs',
        account_number_last4='7832',
        is_active=True,
        display_order=2,
        owner=primary_member,
    )
    BalanceSnapshot.objects.create(
        id=uuid.uuid4(),
        account=savings,
        as_of_date=today,
        balance=Decimal('25000.00'),
    )

    # -- RETIREMENT ACCOUNTS --
    john_401k = Account.objects.create(
        id=uuid.uuid4(),
        household=household,
        name="John's 401(k)",
        account_type='traditional_401k',
        institution='Fidelity',
        account_number_last4='9012',
        is_active=True,
        display_order=3,
        owner=primary_member,
        employer_name='Tech Corp Inc',
    )
    BalanceSnapshot.objects.create(
        id=uuid.uuid4(),
        account=john_401k,
        as_of_date=today,
        balance=Decimal('125000.00'),
        cost_basis=Decimal('95000.00'),
        market_value=Decimal('125000.00'),
    )

    jane_401k = Account.objects.create(
        id=uuid.uuid4(),
        household=household,
        name="Jane's 401(k)",
        account_type='traditional_401k',
        institution='Vanguard',
        account_number_last4='3456',
        is_active=True,
        display_order=4,
        owner=spouse_member,
        employer_name='Healthcare Systems',
    )
    BalanceSnapshot.objects.create(
        id=uuid.uuid4(),
        account=jane_401k,
        as_of_date=today,
        balance=Decimal('85000.00'),
        cost_basis=Decimal('72000.00'),
        market_value=Decimal('85000.00'),
    )

    roth_ira = Account.objects.create(
        id=uuid.uuid4(),
        household=household,
        name="John's Roth IRA",
        account_type='roth_ira',
        institution='Vanguard',
        account_number_last4='5678',
        is_active=True,
        display_order=5,
        owner=primary_member,
    )
    BalanceSnapshot.objects.create(
        id=uuid.uuid4(),
        account=roth_ira,
        as_of_date=today,
        balance=Decimal('45000.00'),
        cost_basis=Decimal('35000.00'),
        market_value=Decimal('45000.00'),
    )

    # HSA Account
    hsa = Account.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Health Savings Account',
        account_type='hsa',
        institution='HSA Bank',
        account_number_last4='2345',
        is_active=True,
        display_order=6,
        owner=primary_member,
    )
    BalanceSnapshot.objects.create(
        id=uuid.uuid4(),
        account=hsa,
        as_of_date=today,
        balance=Decimal('12500.00'),
        cost_basis=Decimal('12500.00'),
        market_value=Decimal('12500.00'),
    )

    # -- INVESTMENT ACCOUNTS --
    brokerage = Account.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Joint Brokerage',
        account_type='brokerage',
        institution='Charles Schwab',
        account_number_last4='8901',
        is_active=True,
        display_order=7,
        owner=primary_member,
    )
    BalanceSnapshot.objects.create(
        id=uuid.uuid4(),
        account=brokerage,
        as_of_date=today,
        balance=Decimal('35000.00'),
        cost_basis=Decimal('28000.00'),
        market_value=Decimal('35000.00'),
    )

    # -- REAL PROPERTY --
    home = Account.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Primary Home',
        account_type='primary_residence',
        institution='',
        is_active=True,
        display_order=8,
        owner=primary_member,
        asset_group=home_asset_group,
    )
    BalanceSnapshot.objects.create(
        id=uuid.uuid4(),
        account=home,
        as_of_date=today,
        balance=Decimal('650000.00'),
        cost_basis=Decimal('480000.00'),
        market_value=Decimal('650000.00'),
    )
    AssetDetails.objects.create(
        id=uuid.uuid4(),
        account=home,
        acquisition_date=date(2019, 4, 15),
        acquisition_cost=Decimal('480000.00'),
        property_type='single_family',
        address_line1='123 Sample Street',
        city='San Francisco',
        state='CA',
        zip_code='94102',
        square_footage=2200,
        lot_size_acres=Decimal('0.15'),
        year_built=1985,
        annual_property_tax=Decimal('8500.00'),
        annual_insurance=Decimal('2400.00'),
        annual_hoa=Decimal('0.00'),
    )

    # -- VEHICLES --
    vehicle = Account.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='2022 Tesla Model 3',
        account_type='vehicle',
        institution='',
        is_active=True,
        display_order=9,
        owner=primary_member,
    )
    BalanceSnapshot.objects.create(
        id=uuid.uuid4(),
        account=vehicle,
        as_of_date=today,
        balance=Decimal('38000.00'),
        cost_basis=Decimal('45000.00'),
        market_value=Decimal('38000.00'),
    )
    AssetDetails.objects.create(
        id=uuid.uuid4(),
        account=vehicle,
        acquisition_date=date(2022, 8, 10),
        acquisition_cost=Decimal('45000.00'),
        make='Tesla',
        model='Model 3',
        year=2022,
        mileage=28000,
    )

    # -- LIABILITIES --

    # Mortgage
    mortgage = Account.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Home Mortgage',
        account_type='primary_mortgage',
        institution='Wells Fargo',
        account_number_last4='1234',
        is_active=True,
        display_order=10,
        owner=primary_member,
        asset_group=home_asset_group,
    )
    BalanceSnapshot.objects.create(
        id=uuid.uuid4(),
        account=mortgage,
        as_of_date=today,
        balance=Decimal('-385000.00'),
    )
    LiabilityDetails.objects.create(
        id=uuid.uuid4(),
        account=mortgage,
        interest_rate=Decimal('0.0625'),
        rate_type='fixed',
        original_balance=Decimal('420000.00'),
        origination_date=date(2019, 4, 15),
        maturity_date=date(2049, 4, 15),
        term_months=360,
        minimum_payment=Decimal('2580.00'),
        payment_day_of_month=1,
        includes_escrow=True,
        escrow_amount=Decimal('908.33'),
    )

    # Auto Loan
    auto_loan = Account.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Tesla Auto Loan',
        account_type='auto_loan',
        institution='Tesla Finance',
        account_number_last4='5678',
        is_active=True,
        display_order=11,
        owner=primary_member,
    )
    BalanceSnapshot.objects.create(
        id=uuid.uuid4(),
        account=auto_loan,
        as_of_date=today,
        balance=Decimal('-22500.00'),
    )
    LiabilityDetails.objects.create(
        id=uuid.uuid4(),
        account=auto_loan,
        interest_rate=Decimal('0.0499'),
        rate_type='fixed',
        original_balance=Decimal('35000.00'),
        origination_date=date(2022, 8, 10),
        maturity_date=date(2027, 8, 10),
        term_months=60,
        minimum_payment=Decimal('660.00'),
        payment_day_of_month=10,
    )

    # Credit Cards
    credit_card = Account.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Chase Sapphire Reserve',
        account_type='credit_card',
        institution='Chase',
        account_number_last4='9876',
        is_active=True,
        display_order=12,
        owner=primary_member,
    )
    BalanceSnapshot.objects.create(
        id=uuid.uuid4(),
        account=credit_card,
        as_of_date=today,
        balance=Decimal('-3250.00'),
    )
    LiabilityDetails.objects.create(
        id=uuid.uuid4(),
        account=credit_card,
        interest_rate=Decimal('0.2199'),
        rate_type='variable',
        credit_limit=Decimal('25000.00'),
        minimum_payment=Decimal('65.00'),
        payment_day_of_month=15,
        rate_index='Prime',
        rate_margin=Decimal('0.1699'),
    )

    # ===================
    # CREATE INCOME SOURCES
    # ===================

    # John's Income
    john_income = IncomeSource.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Tech Corp Inc',
        household_member=primary_member,
        income_type='w2',
        gross_annual_salary=Decimal('145000.00'),
        pay_frequency='biweekly',
        is_active=True,
        start_date=date(2020, 3, 1),
    )

    # John's W2 Withholding
    W2Withholding.objects.create(
        id=uuid.uuid4(),
        income_source=john_income,
        filing_status='married',
        multiple_jobs_or_spouse_works=True,
        child_tax_credit_dependents=1,
        other_dependents=0,
        other_income=Decimal('0.00'),
        deductions=Decimal('0.00'),
        extra_withholding=Decimal('0.00'),
        state_allowances=2,
        state_additional_withholding=Decimal('0.00'),
    )

    # John's Pre-tax Deductions
    PreTaxDeduction.objects.create(
        id=uuid.uuid4(),
        income_source=john_income,
        deduction_type='traditional_401k',
        name='401(k) Contribution',
        amount_type='percentage',
        amount=Decimal('0.10'),
        employer_match_percentage=Decimal('0.50'),
        employer_match_limit_percentage=Decimal('0.06'),
        target_account=john_401k,
        is_active=True,
    )
    PreTaxDeduction.objects.create(
        id=uuid.uuid4(),
        income_source=john_income,
        deduction_type='hsa',
        name='HSA Contribution',
        amount_type='fixed',
        amount=Decimal('300.00'),
        target_account=hsa,
        is_active=True,
    )
    PreTaxDeduction.objects.create(
        id=uuid.uuid4(),
        income_source=john_income,
        deduction_type='health_insurance',
        name='Health Insurance Premium',
        amount_type='fixed',
        amount=Decimal('450.00'),
        is_active=True,
    )

    # Jane's Income
    jane_income = IncomeSource.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Healthcare Systems',
        household_member=spouse_member,
        income_type='w2',
        gross_annual_salary=Decimal('92000.00'),
        pay_frequency='biweekly',
        is_active=True,
        start_date=date(2018, 9, 15),
    )

    # Jane's W2 Withholding
    W2Withholding.objects.create(
        id=uuid.uuid4(),
        income_source=jane_income,
        filing_status='married',
        multiple_jobs_or_spouse_works=True,
        child_tax_credit_dependents=0,
        other_dependents=0,
        other_income=Decimal('0.00'),
        deductions=Decimal('0.00'),
        extra_withholding=Decimal('0.00'),
        state_allowances=2,
        state_additional_withholding=Decimal('0.00'),
    )

    # Jane's Pre-tax Deductions
    PreTaxDeduction.objects.create(
        id=uuid.uuid4(),
        income_source=jane_income,
        deduction_type='traditional_401k',
        name='401(k) Contribution',
        amount_type='percentage',
        amount=Decimal('0.08'),
        employer_match_percentage=Decimal('1.00'),
        employer_match_limit_percentage=Decimal('0.03'),
        target_account=jane_401k,
        is_active=True,
    )

    # ===================
    # CREATE RECURRING FLOWS
    # ===================

    # -- INCOME FLOWS --
    RecurringFlow.objects.create(
        id=uuid.uuid4(),
        household=household,
        name="John's Salary",
        description='Primary W-2 income from Tech Corp',
        flow_type='income',
        income_category='salary',
        amount=Decimal('5576.92'),
        frequency='biweekly',
        start_date=date(2020, 3, 1),
        linked_account=checking,
        household_member=primary_member,
        income_source=john_income,
        is_active=True,
        is_baseline=True,
        is_system_generated=True,
        system_source_model='IncomeSource',
        system_flow_kind='net_pay',
    )

    RecurringFlow.objects.create(
        id=uuid.uuid4(),
        household=household,
        name="Jane's Salary",
        description='Primary W-2 income from Healthcare Systems',
        flow_type='income',
        income_category='salary',
        amount=Decimal('3538.46'),
        frequency='biweekly',
        start_date=date(2018, 9, 15),
        linked_account=checking,
        household_member=spouse_member,
        income_source=jane_income,
        is_active=True,
        is_baseline=True,
        is_system_generated=True,
        system_source_model='IncomeSource',
        system_flow_kind='net_pay',
    )

    # -- EXPENSE FLOWS --

    # Housing
    RecurringFlow.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Mortgage Payment',
        description='Monthly mortgage P&I + escrow',
        flow_type='expense',
        expense_category='mortgage_principal',
        amount=Decimal('2580.00'),
        frequency='monthly',
        start_date=date(2019, 5, 1),
        linked_account=mortgage,
        is_active=True,
        is_baseline=True,
    )

    # Utilities
    RecurringFlow.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Electricity',
        flow_type='expense',
        expense_category='electricity',
        amount=Decimal('185.00'),
        frequency='monthly',
        start_date=today - timedelta(days=365),
        is_active=True,
        is_baseline=True,
    )

    RecurringFlow.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Natural Gas',
        flow_type='expense',
        expense_category='natural_gas',
        amount=Decimal('65.00'),
        frequency='monthly',
        start_date=today - timedelta(days=365),
        is_active=True,
        is_baseline=True,
    )

    RecurringFlow.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Water & Sewer',
        flow_type='expense',
        expense_category='water_sewer',
        amount=Decimal('80.00'),
        frequency='monthly',
        start_date=today - timedelta(days=365),
        is_active=True,
        is_baseline=True,
    )

    RecurringFlow.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Internet - Comcast',
        flow_type='expense',
        expense_category='internet',
        amount=Decimal('89.99'),
        frequency='monthly',
        start_date=today - timedelta(days=365),
        is_active=True,
        is_baseline=True,
    )

    RecurringFlow.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Mobile Phone - Family Plan',
        flow_type='expense',
        expense_category='phone',
        amount=Decimal('145.00'),
        frequency='monthly',
        start_date=today - timedelta(days=365),
        is_active=True,
        is_baseline=True,
    )

    # Transportation
    RecurringFlow.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Tesla Auto Loan Payment',
        flow_type='expense',
        expense_category='auto_loan',
        amount=Decimal('660.00'),
        frequency='monthly',
        start_date=date(2022, 9, 10),
        linked_account=auto_loan,
        is_active=True,
        is_baseline=True,
    )

    RecurringFlow.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Auto Insurance',
        flow_type='expense',
        expense_category='auto_insurance',
        amount=Decimal('165.00'),
        frequency='monthly',
        start_date=today - timedelta(days=365),
        is_active=True,
        is_baseline=True,
    )

    RecurringFlow.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Gas & Charging',
        flow_type='expense',
        expense_category='gas_fuel',
        amount=Decimal('120.00'),
        frequency='monthly',
        start_date=today - timedelta(days=365),
        is_active=True,
        is_baseline=True,
    )

    # Food
    RecurringFlow.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Groceries',
        flow_type='expense',
        expense_category='groceries',
        amount=Decimal('850.00'),
        frequency='monthly',
        start_date=today - timedelta(days=365),
        is_active=True,
        is_baseline=True,
    )

    RecurringFlow.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Dining Out',
        flow_type='expense',
        expense_category='dining_out',
        amount=Decimal('350.00'),
        frequency='monthly',
        start_date=today - timedelta(days=365),
        is_active=True,
        is_baseline=True,
    )

    # Childcare
    RecurringFlow.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Daycare - Little Stars',
        flow_type='expense',
        expense_category='childcare',
        amount=Decimal('1800.00'),
        frequency='monthly',
        start_date=date(2021, 9, 1),
        is_active=True,
        is_baseline=True,
    )

    # Insurance
    RecurringFlow.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Term Life Insurance',
        flow_type='expense',
        expense_category='life_insurance',
        amount=Decimal('85.00'),
        frequency='monthly',
        start_date=today - timedelta(days=365),
        is_active=True,
        is_baseline=True,
    )

    # Subscriptions
    RecurringFlow.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Streaming Services (Netflix, Disney+, etc)',
        flow_type='expense',
        expense_category='subscriptions',
        amount=Decimal('55.00'),
        frequency='monthly',
        start_date=today - timedelta(days=365),
        is_active=True,
        is_baseline=True,
    )

    RecurringFlow.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Gym Membership',
        flow_type='expense',
        expense_category='gym_fitness',
        amount=Decimal('79.00'),
        frequency='monthly',
        start_date=today - timedelta(days=365),
        is_active=True,
        is_baseline=True,
    )

    # Credit Card Payment
    RecurringFlow.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Credit Card Payment',
        flow_type='expense',
        expense_category='credit_card_payment',
        amount=Decimal('500.00'),
        frequency='monthly',
        start_date=today - timedelta(days=365),
        linked_account=credit_card,
        is_active=True,
        is_baseline=True,
    )

    # Savings Transfer
    RecurringFlow.objects.create(
        id=uuid.uuid4(),
        household=household,
        name='Emergency Fund Contribution',
        description='Monthly transfer to emergency savings',
        flow_type='transfer',
        amount=Decimal('500.00'),
        frequency='monthly',
        start_date=today - timedelta(days=365),
        from_account=checking,
        to_account=savings,
        is_active=True,
        is_baseline=True,
    )

    # ===================
    # CREATE ONBOARDING PROGRESS
    # ===================
    OnboardingProgress.objects.create(
        id=uuid.uuid4(),
        household=household,
        current_step='complete',
        completed_steps=[
            'welcome', 'household_info', 'members', 'tax_filing',
            'income_sources', 'withholding', 'pretax_deductions',
            'bank_accounts', 'investments', 'retirement', 'real_estate',
            'vehicles', 'mortgages', 'credit_cards', 'housing_expenses',
            'utilities', 'insurance', 'transportation',
            'food', 'review', 'complete'
        ],
        skipped_steps=['business_expenses', 'personal_property', 'business_ownership', 'student_loans', 'other_debts', 'other_expenses'],
        completed_at=timezone.now(),
    )


def remove_sample_data(apps, schema_editor):
    """Remove sample data (reverse migration)."""
    User = apps.get_model('core', 'User')
    Household = apps.get_model('core', 'Household')

    # Delete household (cascades to all related data)
    Household.objects.filter(slug='sample-household').delete()

    # Delete user
    User.objects.filter(email='test@example.com').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0001_initial'),
        ('accounts', '0001_initial'),
        ('flows', '0001_initial'),
        ('taxes', '0001_initial'),
        ('onboarding', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_sample_data, remove_sample_data),
    ]
