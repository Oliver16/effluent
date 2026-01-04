import uuid
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from apps.core.models import HouseholdOwnedModel


class FlowType(models.TextChoices):
    INCOME = 'income', 'Income'
    EXPENSE = 'expense', 'Expense'
    TRANSFER = 'transfer', 'Transfer'


class IncomeCategory(models.TextChoices):
    # Employment
    SALARY = 'salary', 'Salary/Wages'
    HOURLY_WAGES = 'hourly_wages', 'Hourly Wages'
    OVERTIME = 'overtime', 'Overtime Pay'
    BONUS = 'bonus', 'Bonus'
    COMMISSION = 'commission', 'Commission'
    TIPS = 'tips', 'Tips'

    # Self-Employment
    SELF_EMPLOYMENT = 'self_employment', 'Self-Employment Income'
    FREELANCE = 'freelance', 'Freelance/Contract'
    BUSINESS_INCOME = 'business_income', 'Business Income'

    # Investment
    DIVIDENDS = 'dividends', 'Dividends'
    INTEREST = 'interest', 'Interest Income'
    CAPITAL_GAINS = 'capital_gains', 'Capital Gains'

    # Rental/Passive
    RENTAL_INCOME = 'rental_income', 'Rental Income'
    ROYALTIES = 'royalties', 'Royalties'

    # Retirement/Government
    SOCIAL_SECURITY = 'social_security', 'Social Security'
    PENSION = 'pension', 'Pension'
    RETIREMENT_DISTRIBUTION = 'retirement_distribution', 'Retirement Distribution'
    DISABILITY = 'disability', 'Disability Income'
    UNEMPLOYMENT = 'unemployment', 'Unemployment'

    # Other
    CHILD_SUPPORT_RECEIVED = 'child_support_received', 'Child Support Received'
    ALIMONY_RECEIVED = 'alimony_received', 'Alimony Received'
    TRUST_INCOME = 'trust_income', 'Trust/Estate Income'
    OTHER_INCOME = 'other_income', 'Other Income'


class ExpenseCategory(models.TextChoices):
    # Housing - Mortgage (builds equity)
    MORTGAGE_PRINCIPAL = 'mortgage_principal', 'Mortgage Principal'
    MORTGAGE_INTEREST = 'mortgage_interest', 'Mortgage Interest'

    # Housing - Rent (pure expense)
    RENT = 'rent', 'Rent'

    # Housing - Other
    PROPERTY_TAX = 'property_tax', 'Property Tax'
    HOMEOWNERS_INSURANCE = 'homeowners_insurance', "Homeowner's Insurance"
    RENTERS_INSURANCE = 'renters_insurance', "Renter's Insurance"
    HOA_FEES = 'hoa_fees', 'HOA/Condo Fees'
    HOME_MAINTENANCE = 'home_maintenance', 'Home Maintenance & Repairs'
    HOME_IMPROVEMENT = 'home_improvement', 'Home Improvement'
    LAWN_GARDEN = 'lawn_garden', 'Lawn & Garden'
    HOME_SECURITY = 'home_security', 'Home Security'

    # Utilities
    ELECTRICITY = 'electricity', 'Electricity'
    NATURAL_GAS = 'natural_gas', 'Natural Gas'
    WATER_SEWER = 'water_sewer', 'Water & Sewer'
    TRASH = 'trash', 'Trash/Recycling'
    INTERNET = 'internet', 'Internet'
    PHONE = 'phone', 'Phone/Mobile'
    CABLE_STREAMING = 'cable_streaming', 'Cable/Streaming'

    # Transportation
    AUTO_LOAN = 'auto_loan', 'Auto Loan Payment'
    AUTO_LEASE = 'auto_lease', 'Auto Lease Payment'
    AUTO_INSURANCE = 'auto_insurance', 'Auto Insurance'
    GAS_FUEL = 'gas_fuel', 'Gas/Fuel'
    AUTO_MAINTENANCE = 'auto_maintenance', 'Auto Maintenance'
    PARKING = 'parking', 'Parking'
    TOLLS = 'tolls', 'Tolls'
    PUBLIC_TRANSIT = 'public_transit', 'Public Transit'
    RIDESHARE = 'rideshare', 'Rideshare/Taxi'

    # Insurance
    HEALTH_INSURANCE = 'health_insurance', 'Health Insurance'
    DENTAL_INSURANCE = 'dental_insurance', 'Dental Insurance'
    VISION_INSURANCE = 'vision_insurance', 'Vision Insurance'
    LIFE_INSURANCE = 'life_insurance', 'Life Insurance'
    DISABILITY_INSURANCE = 'disability_insurance', 'Disability Insurance'
    UMBRELLA_INSURANCE = 'umbrella_insurance', 'Umbrella Insurance'

    # Healthcare
    MEDICAL_EXPENSES = 'medical_expenses', 'Medical Expenses'
    DENTAL_EXPENSES = 'dental_expenses', 'Dental Expenses'
    VISION_EXPENSES = 'vision_expenses', 'Vision/Optical'
    PRESCRIPTIONS = 'prescriptions', 'Prescriptions'
    MENTAL_HEALTH = 'mental_health', 'Mental Health'
    GYM_FITNESS = 'gym_fitness', 'Gym/Fitness'

    # Food
    GROCERIES = 'groceries', 'Groceries'
    DINING_OUT = 'dining_out', 'Dining Out'
    COFFEE_SNACKS = 'coffee_snacks', 'Coffee/Snacks'
    FOOD_DELIVERY = 'food_delivery', 'Food Delivery'

    # Debt Payments
    CREDIT_CARD_PAYMENT = 'credit_card_payment', 'Credit Card Payment'
    STUDENT_LOAN = 'student_loan', 'Student Loan Payment'
    PERSONAL_LOAN = 'personal_loan', 'Personal Loan Payment'
    HELOC_PAYMENT = 'heloc_payment', 'HELOC Payment'
    OTHER_DEBT = 'other_debt', 'Other Debt Payment'

    # Children
    CHILDCARE = 'childcare', 'Childcare/Daycare'
    CHILD_ACTIVITIES = 'child_activities', 'Children Activities'
    SCHOOL_TUITION = 'school_tuition', 'School Tuition (K-12)'
    CHILD_SUPPORT_PAID = 'child_support_paid', 'Child Support Paid'

    # Education
    COLLEGE_TUITION = 'college_tuition', 'College Tuition'
    BOOKS_SUPPLIES = 'books_supplies', 'Books & Supplies'
    PROFESSIONAL_DEV = 'professional_dev', 'Professional Development'

    # Personal
    CLOTHING = 'clothing', 'Clothing'
    PERSONAL_CARE = 'personal_care', 'Personal Care'

    # Entertainment
    ENTERTAINMENT = 'entertainment', 'Entertainment'
    HOBBIES = 'hobbies', 'Hobbies'
    SUBSCRIPTIONS = 'subscriptions', 'Subscriptions'
    VACATION_TRAVEL = 'vacation_travel', 'Vacation/Travel'

    # Pets
    PET_FOOD = 'pet_food', 'Pet Food'
    PET_VET = 'pet_vet', 'Pet Veterinary'
    PET_SUPPLIES = 'pet_supplies', 'Pet Supplies'

    # Giving
    CHARITABLE = 'charitable', 'Charitable Donations'
    RELIGIOUS = 'religious', 'Religious Contributions'
    GIFTS = 'gifts', 'Gifts to Others'

    # Financial
    BANK_FEES = 'bank_fees', 'Bank Fees'
    INVESTMENT_FEES = 'investment_fees', 'Investment Fees'
    TAX_PREP = 'tax_prep', 'Tax Preparation'

    # Taxes
    ESTIMATED_TAX = 'estimated_tax', 'Estimated Tax Payments'

    # Other
    ALIMONY_PAID = 'alimony_paid', 'Alimony Paid'
    HOUSEHOLD_SUPPLIES = 'household_supplies', 'Household Supplies'
    MISCELLANEOUS = 'miscellaneous', 'Miscellaneous'


# Category Groupings for Analysis
HOUSING_CATEGORIES = {
    ExpenseCategory.MORTGAGE_PRINCIPAL, ExpenseCategory.MORTGAGE_INTEREST,
    ExpenseCategory.RENT, ExpenseCategory.PROPERTY_TAX,
    ExpenseCategory.HOMEOWNERS_INSURANCE, ExpenseCategory.RENTERS_INSURANCE,
    ExpenseCategory.HOA_FEES, ExpenseCategory.HOME_MAINTENANCE,
}

ESSENTIAL_CATEGORIES = {
    ExpenseCategory.MORTGAGE_PRINCIPAL, ExpenseCategory.MORTGAGE_INTEREST,
    ExpenseCategory.RENT, ExpenseCategory.PROPERTY_TAX,
    ExpenseCategory.HOMEOWNERS_INSURANCE, ExpenseCategory.RENTERS_INSURANCE,
    ExpenseCategory.ELECTRICITY, ExpenseCategory.NATURAL_GAS,
    ExpenseCategory.WATER_SEWER, ExpenseCategory.GROCERIES,
    ExpenseCategory.HEALTH_INSURANCE, ExpenseCategory.AUTO_INSURANCE,
    ExpenseCategory.GAS_FUEL, ExpenseCategory.PRESCRIPTIONS,
    ExpenseCategory.CHILDCARE,
}

FIXED_CATEGORIES = {
    ExpenseCategory.MORTGAGE_PRINCIPAL, ExpenseCategory.MORTGAGE_INTEREST,
    ExpenseCategory.RENT, ExpenseCategory.AUTO_LOAN, ExpenseCategory.AUTO_LEASE,
    ExpenseCategory.STUDENT_LOAN, ExpenseCategory.PERSONAL_LOAN,
    ExpenseCategory.CREDIT_CARD_PAYMENT, ExpenseCategory.CHILDCARE,
    ExpenseCategory.HEALTH_INSURANCE, ExpenseCategory.AUTO_INSURANCE,
    ExpenseCategory.HOMEOWNERS_INSURANCE, ExpenseCategory.LIFE_INSURANCE,
    ExpenseCategory.SUBSCRIPTIONS, ExpenseCategory.HOA_FEES,
    ExpenseCategory.GYM_FITNESS, ExpenseCategory.INTERNET, ExpenseCategory.PHONE,
}

DEBT_PAYMENT_CATEGORIES = {
    ExpenseCategory.MORTGAGE_PRINCIPAL, ExpenseCategory.MORTGAGE_INTEREST,
    ExpenseCategory.AUTO_LOAN, ExpenseCategory.STUDENT_LOAN,
    ExpenseCategory.PERSONAL_LOAN, ExpenseCategory.CREDIT_CARD_PAYMENT,
    ExpenseCategory.HELOC_PAYMENT, ExpenseCategory.OTHER_DEBT,
}


class Frequency(models.TextChoices):
    WEEKLY = 'weekly', 'Weekly'
    BIWEEKLY = 'biweekly', 'Every 2 Weeks'
    SEMIMONTHLY = 'semimonthly', 'Twice a Month'
    MONTHLY = 'monthly', 'Monthly'
    BIMONTHLY = 'bimonthly', 'Every 2 Months'
    QUARTERLY = 'quarterly', 'Quarterly'
    SEMIANNUALLY = 'semiannually', 'Twice a Year'
    ANNUALLY = 'annually', 'Annually'


FREQUENCY_TO_MONTHLY = {
    Frequency.WEEKLY: Decimal('52') / Decimal('12'),
    Frequency.BIWEEKLY: Decimal('26') / Decimal('12'),
    Frequency.SEMIMONTHLY: Decimal('2'),
    Frequency.MONTHLY: Decimal('1'),
    Frequency.BIMONTHLY: Decimal('1') / Decimal('2'),
    Frequency.QUARTERLY: Decimal('1') / Decimal('3'),
    Frequency.SEMIANNUALLY: Decimal('1') / Decimal('6'),
    Frequency.ANNUALLY: Decimal('1') / Decimal('12'),
}

FREQUENCY_TO_ANNUAL = {
    Frequency.WEEKLY: Decimal('52'),
    Frequency.BIWEEKLY: Decimal('26'),
    Frequency.SEMIMONTHLY: Decimal('24'),
    Frequency.MONTHLY: Decimal('12'),
    Frequency.BIMONTHLY: Decimal('6'),
    Frequency.QUARTERLY: Decimal('4'),
    Frequency.SEMIANNUALLY: Decimal('2'),
    Frequency.ANNUALLY: Decimal('1'),
}


class RecurringFlow(HouseholdOwnedModel):
    """A recurring income or expense."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    flow_type = models.CharField(max_length=20, choices=FlowType.choices)
    income_category = models.CharField(max_length=50, choices=IncomeCategory.choices, blank=True)
    expense_category = models.CharField(max_length=50, choices=ExpenseCategory.choices, blank=True)

    amount = models.DecimalField(
        max_digits=12, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    frequency = models.CharField(max_length=20, choices=Frequency.choices)

    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)

    linked_account = models.ForeignKey(
        'accounts.Account', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='linked_flows'
    )
    household_member = models.ForeignKey(
        'core.HouseholdMember', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='flows'
    )
    income_source = models.ForeignKey(
        'taxes.IncomeSource', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='flows'
    )

    is_active = models.BooleanField(default=True)
    is_baseline = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'recurring_flows'
        ordering = ['flow_type', '-amount']

    def __str__(self):
        return f"{self.household.name} - {self.name}"

    @property
    def category(self) -> str:
        if self.flow_type == FlowType.INCOME:
            return self.income_category
        return self.expense_category

    @property
    def monthly_amount(self) -> Decimal:
        multiplier = FREQUENCY_TO_MONTHLY.get(self.frequency, Decimal('1'))
        return self.amount * multiplier

    @property
    def annual_amount(self) -> Decimal:
        multiplier = FREQUENCY_TO_ANNUAL.get(self.frequency, Decimal('1'))
        return self.amount * multiplier

    @property
    def is_income(self) -> bool:
        return self.flow_type == FlowType.INCOME

    @property
    def is_expense(self) -> bool:
        return self.flow_type == FlowType.EXPENSE

    @property
    def is_housing(self) -> bool:
        return self.expense_category in HOUSING_CATEGORIES

    @property
    def is_essential(self) -> bool:
        return self.expense_category in ESSENTIAL_CATEGORIES

    @property
    def is_fixed(self) -> bool:
        return self.expense_category in FIXED_CATEGORIES

    @property
    def is_debt_payment(self) -> bool:
        return self.expense_category in DEBT_PAYMENT_CATEGORIES

    def is_active_on(self, check_date) -> bool:
        if not self.is_active:
            return False
        if self.start_date > check_date:
            return False
        if self.end_date and self.end_date < check_date:
            return False
        return True
