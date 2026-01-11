"""
Default Decision Templates

These templates define the wizards for common financial decisions.
Each template includes:
- UI schema: defines the wizard steps and form fields
- Change plan: defines how to convert inputs into ScenarioChange records
"""
from apps.scenarios.models import ChangeType
from .models import DecisionCategory, FieldType


# Field type shortcuts for cleaner definitions
CURRENCY = FieldType.CURRENCY
PERCENT = FieldType.PERCENT
INTEGER = FieldType.INTEGER
SELECT = FieldType.SELECT
DATE = FieldType.DATE
TOGGLE = FieldType.TOGGLE
TEXT = FieldType.TEXT
DEBT_SELECT = FieldType.DEBT_SELECT
ASSET_SELECT = FieldType.ASSET_SELECT
ACCOUNT_SELECT = FieldType.ACCOUNT_SELECT


def get_default_templates():
    """Return the default decision templates."""
    return [
        # ===================
        # INCOME TEMPLATES
        # ===================
        {
            'key': 'increase_income',
            'name': 'Increase Income',
            'description': 'Model a salary raise, new income source, or side income.',
            'category': DecisionCategory.INCOME,
            'icon': 'trending-up',
            'sort_order': 1,
            'ui_schema': {
                'steps': [
                    {
                        'id': 'income_details',
                        'title': 'Income Details',
                        'description': 'Tell us about your income increase',
                        'fields': [
                            {
                                'key': 'income_type',
                                'type': SELECT,
                                'label': 'Type of income change',
                                'required': True,
                                'options': [
                                    {'value': 'raise', 'label': 'Salary raise'},
                                    {'value': 'new_job', 'label': 'New job'},
                                    {'value': 'side_income', 'label': 'Side income / Freelance'},
                                    {'value': 'bonus', 'label': 'Recurring bonus'},
                                ],
                            },
                            {
                                'key': 'income_name',
                                'type': TEXT,
                                'label': 'Name for this income',
                                'placeholder': 'e.g., Freelance consulting',
                                'required': True,
                            },
                            {
                                'key': 'amount',
                                'type': CURRENCY,
                                'label': 'Amount',
                                'required': True,
                                'helperText': 'Enter the income amount',
                            },
                            {
                                'key': 'frequency',
                                'type': SELECT,
                                'label': 'Frequency',
                                'required': True,
                                'default': 'monthly',
                                'options': [
                                    {'value': 'weekly', 'label': 'Weekly'},
                                    {'value': 'biweekly', 'label': 'Bi-weekly'},
                                    {'value': 'semimonthly', 'label': 'Semi-monthly'},
                                    {'value': 'monthly', 'label': 'Monthly'},
                                    {'value': 'quarterly', 'label': 'Quarterly'},
                                    {'value': 'annually', 'label': 'Annually'},
                                ],
                            },
                        ],
                    },
                    {
                        'id': 'timing',
                        'title': 'When',
                        'description': 'When does this income start?',
                        'fields': [
                            {
                                'key': 'start_date',
                                'type': DATE,
                                'label': 'Start date',
                                'required': True,
                            },
                            {
                                'key': 'has_end_date',
                                'type': TOGGLE,
                                'label': 'Has an end date',
                                'default': False,
                            },
                            {
                                'key': 'end_date',
                                'type': DATE,
                                'label': 'End date',
                                'required': False,
                                'showIf': 'has_end_date',
                            },
                        ],
                    },
                ],
            },
            'change_plan': {
                'changes': [
                    {
                        'change_type': ChangeType.ADD_INCOME,
                        'name_template': '{income_name}',
                        'description_template': 'New income: {amount} {frequency}',
                        'effective_date_field': 'start_date',
                        'end_date_field': 'end_date',
                        'parameters': {
                            'amount': '{amount}',
                            'frequency': '{frequency}',
                            'category': 'other_income',
                        },
                    },
                ],
            },
        },

        # ===================
        # EXPENSE TEMPLATES
        # ===================
        {
            'key': 'add_expense',
            'name': 'Add Expense',
            'description': 'Add a new recurring expense to your budget.',
            'category': DecisionCategory.EXPENSES,
            'icon': 'minus-circle',
            'sort_order': 1,
            'ui_schema': {
                'steps': [
                    {
                        'id': 'expense_details',
                        'title': 'Expense Details',
                        'description': 'Tell us about the expense',
                        'fields': [
                            {
                                'key': 'expense_name',
                                'type': TEXT,
                                'label': 'Expense name',
                                'placeholder': 'e.g., Gym membership',
                                'required': True,
                            },
                            {
                                'key': 'category',
                                'type': SELECT,
                                'label': 'Category',
                                'required': True,
                                'options': [
                                    {'value': 'housing', 'label': 'Housing'},
                                    {'value': 'utilities', 'label': 'Utilities'},
                                    {'value': 'transportation', 'label': 'Transportation'},
                                    {'value': 'groceries', 'label': 'Groceries'},
                                    {'value': 'dining_out', 'label': 'Dining Out'},
                                    {'value': 'healthcare', 'label': 'Healthcare'},
                                    {'value': 'insurance', 'label': 'Insurance'},
                                    {'value': 'entertainment', 'label': 'Entertainment'},
                                    {'value': 'subscriptions', 'label': 'Subscriptions'},
                                    {'value': 'personal_care', 'label': 'Personal Care'},
                                    {'value': 'childcare', 'label': 'Childcare'},
                                    {'value': 'education', 'label': 'Education'},
                                    {'value': 'miscellaneous', 'label': 'Other'},
                                ],
                            },
                            {
                                'key': 'amount',
                                'type': CURRENCY,
                                'label': 'Amount',
                                'required': True,
                            },
                            {
                                'key': 'frequency',
                                'type': SELECT,
                                'label': 'Frequency',
                                'required': True,
                                'default': 'monthly',
                                'options': [
                                    {'value': 'weekly', 'label': 'Weekly'},
                                    {'value': 'biweekly', 'label': 'Bi-weekly'},
                                    {'value': 'monthly', 'label': 'Monthly'},
                                    {'value': 'quarterly', 'label': 'Quarterly'},
                                    {'value': 'annually', 'label': 'Annually'},
                                ],
                            },
                        ],
                    },
                    {
                        'id': 'timing',
                        'title': 'When',
                        'description': 'When does this expense start?',
                        'fields': [
                            {
                                'key': 'start_date',
                                'type': DATE,
                                'label': 'Start date',
                                'required': True,
                            },
                            {
                                'key': 'has_end_date',
                                'type': TOGGLE,
                                'label': 'Has an end date',
                                'default': False,
                            },
                            {
                                'key': 'end_date',
                                'type': DATE,
                                'label': 'End date',
                                'required': False,
                                'showIf': 'has_end_date',
                            },
                        ],
                    },
                ],
            },
            'change_plan': {
                'changes': [
                    {
                        'change_type': ChangeType.ADD_EXPENSE,
                        'name_template': '{expense_name}',
                        'description_template': 'New expense: {amount} {frequency}',
                        'effective_date_field': 'start_date',
                        'end_date_field': 'end_date',
                        'parameters': {
                            'amount': '{amount}',
                            'frequency': '{frequency}',
                            'category': '{category}',
                        },
                    },
                ],
            },
        },
        {
            'key': 'one_time_expense',
            'name': 'One-Time Expense',
            'description': 'Model a large one-time purchase or expense.',
            'category': DecisionCategory.EXPENSES,
            'icon': 'credit-card',
            'sort_order': 2,
            'ui_schema': {
                'steps': [
                    {
                        'id': 'expense_details',
                        'title': 'Expense Details',
                        'description': 'What is this expense for?',
                        'fields': [
                            {
                                'key': 'expense_name',
                                'type': TEXT,
                                'label': 'What is it for?',
                                'placeholder': 'e.g., New laptop, Vacation, Home repair',
                                'required': True,
                            },
                            {
                                'key': 'amount',
                                'type': CURRENCY,
                                'label': 'Amount',
                                'required': True,
                            },
                            {
                                'key': 'expense_date',
                                'type': DATE,
                                'label': 'When',
                                'required': True,
                            },
                        ],
                    },
                ],
            },
            'change_plan': {
                'changes': [
                    {
                        'change_type': ChangeType.LUMP_SUM_EXPENSE,
                        'name_template': '{expense_name}',
                        'description_template': 'One-time expense: {amount}',
                        'effective_date_field': 'expense_date',
                        'parameters': {
                            'amount': '{amount}',
                        },
                    },
                ],
            },
        },

        # ===================
        # DEBT TEMPLATES
        # ===================
        {
            'key': 'payoff_debt',
            'name': 'Pay Off Debt',
            'description': 'Accelerate debt payoff with extra payments.',
            'category': DecisionCategory.DEBT,
            'icon': 'check-circle',
            'sort_order': 1,
            'ui_schema': {
                'steps': [
                    {
                        'id': 'debt_selection',
                        'title': 'Select Debt',
                        'description': 'Which debt do you want to pay off faster?',
                        'fields': [
                            {
                                'key': 'source_account_id',
                                'type': DEBT_SELECT,
                                'label': 'Select debt account',
                                'required': True,
                                'helperText': 'Choose the debt you want to pay off faster',
                            },
                        ],
                    },
                    {
                        'id': 'payment_plan',
                        'title': 'Extra Payments',
                        'description': 'How much extra can you pay?',
                        'fields': [
                            {
                                'key': 'extra_monthly',
                                'type': CURRENCY,
                                'label': 'Extra monthly payment',
                                'required': True,
                                'helperText': 'Amount above your minimum payment',
                            },
                            {
                                'key': 'start_date',
                                'type': DATE,
                                'label': 'When to start',
                                'required': True,
                            },
                        ],
                    },
                ],
            },
            'change_plan': {
                'changes': [
                    {
                        'change_type': ChangeType.PAYOFF_DEBT,
                        'name_template': 'Extra payments on debt',
                        'description_template': 'Paying extra {extra_monthly}/month',
                        'effective_date_field': 'start_date',
                        # source_account_id is handled specially by the compiler
                        'source_account_id_field': 'source_account_id',
                        'parameters': {
                            'extra_monthly': '{extra_monthly}',
                        },
                    },
                ],
            },
        },
        {
            'key': 'refinance',
            'name': 'Refinance',
            'description': 'Refinance a loan to a lower rate or different term.',
            'category': DecisionCategory.DEBT,
            'icon': 'refresh-cw',
            'sort_order': 2,
            'ui_schema': {
                'steps': [
                    {
                        'id': 'current_loan',
                        'title': 'Current Loan',
                        'description': 'Select the loan you want to refinance',
                        'fields': [
                            {
                                'key': 'source_account_id',
                                'type': DEBT_SELECT,
                                'label': 'Select loan to refinance',
                                'required': True,
                                'helperText': 'Choose the loan you want to refinance',
                            },
                        ],
                    },
                    {
                        'id': 'new_terms',
                        'title': 'New Loan Terms',
                        'description': 'What are the terms of the refinanced loan?',
                        'fields': [
                            {
                                'key': 'new_rate',
                                'type': PERCENT,
                                'label': 'New interest rate',
                                'required': True,
                            },
                            {
                                'key': 'new_term_months',
                                'type': INTEGER,
                                'label': 'New loan term (months)',
                                'required': True,
                                'helperText': 'e.g., 360 for 30-year, 180 for 15-year',
                            },
                            {
                                'key': 'closing_costs',
                                'type': CURRENCY,
                                'label': 'Closing costs',
                                'required': False,
                                'default': 0,
                                'helperText': 'Costs rolled into the new loan',
                            },
                        ],
                    },
                    {
                        'id': 'timing',
                        'title': 'When',
                        'description': 'When will you refinance?',
                        'fields': [
                            {
                                'key': 'refinance_date',
                                'type': DATE,
                                'label': 'Refinance date',
                                'required': True,
                            },
                        ],
                    },
                ],
            },
            'change_plan': {
                'changes': [
                    {
                        'change_type': ChangeType.REFINANCE,
                        'name_template': 'Refinance loan',
                        'description_template': 'Refinanced to {new_rate}% for {new_term_months} months',
                        'effective_date_field': 'refinance_date',
                        # source_account_id is handled specially by the compiler
                        'source_account_id_field': 'source_account_id',
                        'parameters': {
                            'rate': '{new_rate}',
                            'term_months': '{new_term_months}',
                            'closing_costs': '{closing_costs}',
                        },
                    },
                ],
            },
        },
        {
            'key': 'add_debt',
            'name': 'Take On New Debt',
            'description': 'Model a new loan or credit line.',
            'category': DecisionCategory.DEBT,
            'icon': 'plus-circle',
            'sort_order': 3,
            'ui_schema': {
                'steps': [
                    {
                        'id': 'loan_details',
                        'title': 'Loan Details',
                        'description': 'Tell us about the loan',
                        'fields': [
                            {
                                'key': 'loan_name',
                                'type': TEXT,
                                'label': 'Loan name',
                                'placeholder': 'e.g., Auto Loan, Personal Loan',
                                'required': True,
                            },
                            {
                                'key': 'loan_type',
                                'type': SELECT,
                                'label': 'Loan type',
                                'required': True,
                                'options': [
                                    {'value': 'auto_loan', 'label': 'Auto Loan'},
                                    {'value': 'personal_loan', 'label': 'Personal Loan'},
                                    {'value': 'student_loan', 'label': 'Student Loan'},
                                    {'value': 'heloc', 'label': 'HELOC'},
                                    {'value': 'credit_card', 'label': 'Credit Card'},
                                    {'value': 'other_debt', 'label': 'Other'},
                                ],
                            },
                            {
                                'key': 'principal',
                                'type': CURRENCY,
                                'label': 'Loan amount',
                                'required': True,
                            },
                            {
                                'key': 'rate',
                                'type': PERCENT,
                                'label': 'Interest rate (APR)',
                                'required': True,
                            },
                            {
                                'key': 'term_months',
                                'type': INTEGER,
                                'label': 'Loan term (months)',
                                'required': True,
                                'helperText': 'e.g., 60 for 5-year loan',
                            },
                        ],
                    },
                    {
                        'id': 'timing',
                        'title': 'When',
                        'description': 'When will you take this loan?',
                        'fields': [
                            {
                                'key': 'start_date',
                                'type': DATE,
                                'label': 'Loan start date',
                                'required': True,
                            },
                        ],
                    },
                ],
            },
            'change_plan': {
                'changes': [
                    {
                        'change_type': ChangeType.ADD_DEBT,
                        'name_template': '{loan_name}',
                        'description_template': 'New loan: {principal} at {rate}% for {term_months} months',
                        'effective_date_field': 'start_date',
                        'parameters': {
                            'principal': '{principal}',
                            'rate': '{rate}',
                            'term_months': '{term_months}',
                        },
                    },
                ],
            },
        },

        # ===================
        # RETIREMENT TEMPLATES
        # ===================
        {
            'key': 'change_401k',
            'name': 'Change 401(k) Contribution',
            'description': 'Adjust your 401(k) contribution rate.',
            'category': DecisionCategory.RETIREMENT,
            'icon': 'piggy-bank',
            'sort_order': 1,
            'ui_schema': {
                'steps': [
                    {
                        'id': 'contribution',
                        'title': '401(k) Contribution',
                        'description': 'Set your new contribution rate',
                        'fields': [
                            {
                                'key': 'percentage',
                                'type': PERCENT,
                                'label': 'Contribution rate',
                                'required': True,
                                'helperText': 'Percentage of your gross salary',
                                'min': 0,
                                'max': 100,
                            },
                            {
                                'key': 'start_date',
                                'type': DATE,
                                'label': 'Effective date',
                                'required': True,
                            },
                        ],
                    },
                ],
            },
            'change_plan': {
                'changes': [
                    {
                        'change_type': ChangeType.MODIFY_401K,
                        'name_template': '401(k) contribution to {percentage}%',
                        'description_template': 'Changed 401(k) contribution rate to {percentage}%',
                        'effective_date_field': 'start_date',
                        'parameters': {
                            'percentage': '{percentage}',
                        },
                    },
                ],
            },
        },
        {
            'key': 'change_hsa',
            'name': 'Change HSA Contribution',
            'description': 'Adjust your HSA contribution amount.',
            'category': DecisionCategory.RETIREMENT,
            'icon': 'heart-pulse',
            'sort_order': 2,
            'ui_schema': {
                'steps': [
                    {
                        'id': 'contribution',
                        'title': 'HSA Contribution',
                        'description': 'Set your new contribution rate',
                        'fields': [
                            {
                                'key': 'percentage',
                                'type': PERCENT,
                                'label': 'Contribution rate',
                                'required': True,
                                'helperText': 'Percentage of your gross salary',
                                'min': 0,
                                'max': 100,
                            },
                            {
                                'key': 'start_date',
                                'type': DATE,
                                'label': 'Effective date',
                                'required': True,
                            },
                        ],
                    },
                ],
            },
            'change_plan': {
                'changes': [
                    {
                        'change_type': ChangeType.MODIFY_HSA,
                        'name_template': 'HSA contribution to {percentage}%',
                        'description_template': 'Changed HSA contribution rate to {percentage}%',
                        'effective_date_field': 'start_date',
                        'parameters': {
                            'percentage': '{percentage}',
                        },
                    },
                ],
            },
        },

        # ===================
        # TAX TEMPLATES
        # ===================
        {
            'key': 'set_quarterly_estimates',
            'name': 'Set Quarterly Estimated Taxes',
            'description': 'Set up quarterly estimated tax payments for self-employment or other income.',
            'category': DecisionCategory.EXPENSES,
            'icon': 'calendar',
            'sort_order': 3,
            'ui_schema': {
                'steps': [
                    {
                        'id': 'estimate_details',
                        'title': 'Quarterly Estimate',
                        'description': 'Set up your quarterly estimated tax payments',
                        'fields': [
                            {
                                'key': 'quarterly_amount',
                                'type': CURRENCY,
                                'label': 'Quarterly payment amount',
                                'required': True,
                                'helperText': 'Amount to pay each quarter (4 times per year)',
                            },
                            {
                                'key': 'start_date',
                                'type': DATE,
                                'label': 'Start date',
                                'required': True,
                                'helperText': 'When to begin quarterly payments',
                            },
                        ],
                    },
                ],
            },
            'change_plan': {
                'changes': [
                    {
                        'change_type': ChangeType.SET_QUARTERLY_ESTIMATES,
                        'name_template': 'Quarterly Estimated Taxes',
                        'description_template': 'Quarterly tax payments of {quarterly_amount}',
                        'effective_date_field': 'start_date',
                        'parameters': {
                            'quarterly_amount': '{quarterly_amount}',
                        },
                    },
                ],
            },
        },

        # ===================
        # SAVINGS TEMPLATES
        # ===================
        {
            'key': 'start_savings',
            'name': 'Start Saving',
            'description': 'Set up a new recurring savings goal.',
            'category': DecisionCategory.SAVINGS,
            'icon': 'wallet',
            'sort_order': 1,
            'ui_schema': {
                'steps': [
                    {
                        'id': 'savings_details',
                        'title': 'Savings Goal',
                        'description': 'What are you saving for?',
                        'fields': [
                            {
                                'key': 'savings_name',
                                'type': TEXT,
                                'label': 'Name for this savings',
                                'placeholder': 'e.g., Emergency Fund, Vacation Fund',
                                'required': True,
                            },
                            {
                                'key': 'monthly_amount',
                                'type': CURRENCY,
                                'label': 'Monthly savings amount',
                                'required': True,
                            },
                            {
                                'key': 'start_date',
                                'type': DATE,
                                'label': 'Start date',
                                'required': True,
                            },
                        ],
                    },
                ],
            },
            'change_plan': {
                'changes': [
                    {
                        'change_type': ChangeType.ADD_EXPENSE,
                        'name_template': 'Savings: {savings_name}',
                        'description_template': 'Monthly savings of {monthly_amount}',
                        'effective_date_field': 'start_date',
                        'parameters': {
                            'amount': '{monthly_amount}',
                            'frequency': 'monthly',
                            'category': 'savings',
                        },
                    },
                ],
            },
        },
    ]


def load_default_templates():
    """Load default templates into the database."""
    from .models import DecisionTemplate

    templates = get_default_templates()
    created_count = 0
    updated_count = 0

    for template_data in templates:
        template, created = DecisionTemplate.objects.update_or_create(
            key=template_data['key'],
            defaults={
                'name': template_data['name'],
                'description': template_data['description'],
                'category': template_data['category'],
                'icon': template_data.get('icon', 'calculator'),
                'ui_schema': template_data['ui_schema'],
                'change_plan': template_data['change_plan'],
                'sort_order': template_data.get('sort_order', 0),
                'is_active': True,
            }
        )
        if created:
            created_count += 1
        else:
            updated_count += 1

    return created_count, updated_count
