"""
TASK-15: Stress Test Templates

Declarative templates for stress testing financial scenarios.
Each template maps to a decision template or direct ChangeType.
"""
from apps.scenarios.models import ChangeType


class StressTestCategory:
    """Categories for stress tests."""
    INCOME = 'income'
    EXPENSE = 'expense'
    INTEREST_RATE = 'interest_rate'
    MARKET = 'market'
    INFLATION = 'inflation'


# Complete V1 template set as specified in TASK-15
STRESS_TESTS = {
    # Income stress tests
    'income_drop_10': {
        'name': 'Income Drop 10%',
        'category': StressTestCategory.INCOME,
        'description': 'Reduce total income by 10% starting next month.',
        'severity': 'warning',
        'template_key': 'adjust_total_income',
        'change_type': ChangeType.ADJUST_TOTAL_INCOME,
        'default_inputs': {
            'amount': '-0.10',
            'mode': 'percent',
            'start_date': 'next_month'
        }
    },
    'income_drop_25': {
        'name': 'Income Drop 25%',
        'category': StressTestCategory.INCOME,
        'description': 'Reduce total income by 25% starting next month.',
        'severity': 'critical',
        'template_key': 'adjust_total_income',
        'change_type': ChangeType.ADJUST_TOTAL_INCOME,
        'default_inputs': {
            'amount': '-0.25',
            'mode': 'percent',
            'start_date': 'next_month'
        }
    },
    'income_drop_50': {
        'name': 'Income Drop 50%',
        'category': StressTestCategory.INCOME,
        'description': 'Reduce total income by 50% starting next month (job loss scenario).',
        'severity': 'critical',
        'template_key': 'adjust_total_income',
        'change_type': ChangeType.ADJUST_TOTAL_INCOME,
        'default_inputs': {
            'amount': '-0.50',
            'mode': 'percent',
            'start_date': 'next_month'
        }
    },

    # Expense stress tests
    'expense_spike_500': {
        'name': 'Expense Spike $500/mo',
        'category': StressTestCategory.EXPENSE,
        'description': 'Add $500/month unexpected expenses.',
        'severity': 'warning',
        'template_key': 'adjust_total_expenses',
        'change_type': ChangeType.ADJUST_TOTAL_EXPENSES,
        'default_inputs': {
            'amount': '500.00',
            'mode': 'absolute',
            'start_date': 'next_month'
        }
    },
    'expense_spike_1000': {
        'name': 'Expense Spike $1000/mo',
        'category': StressTestCategory.EXPENSE,
        'description': 'Add $1000/month unexpected expenses.',
        'severity': 'critical',
        'template_key': 'adjust_total_expenses',
        'change_type': ChangeType.ADJUST_TOTAL_EXPENSES,
        'default_inputs': {
            'amount': '1000.00',
            'mode': 'absolute',
            'start_date': 'next_month'
        }
    },

    # Interest rate stress tests
    'rate_shock_2': {
        'name': 'Interest Rate +2%',
        'category': StressTestCategory.INTEREST_RATE,
        'description': 'Increase variable interest rates by 2%.',
        'severity': 'warning',
        'template_key': 'adjust_interest_rates',
        'change_type': ChangeType.ADJUST_INTEREST_RATES,
        'default_inputs': {
            'adjustment_percent': '2.0',
            'applies_to': 'variable',
            'start_date': 'next_month'
        }
    },

    # Market stress tests
    'market_drop_20': {
        'name': 'Market Drop 20%',
        'category': StressTestCategory.MARKET,
        'description': 'Investment values drop 20% with 36-month recovery.',
        'severity': 'warning',
        'template_key': 'adjust_investment_value',
        'change_type': ChangeType.ADJUST_INVESTMENT_VALUE,
        'default_inputs': {
            'percent_change': '-0.20',
            'recovery_months': 36,
            'applies_to': 'all',
            'start_date': 'next_month'
        }
    },
    'market_drop_40': {
        'name': 'Market Drop 40%',
        'category': StressTestCategory.MARKET,
        'description': 'Investment values drop 40% with 48-month recovery (2008-style crash).',
        'severity': 'critical',
        'template_key': 'adjust_investment_value',
        'change_type': ChangeType.ADJUST_INVESTMENT_VALUE,
        'default_inputs': {
            'percent_change': '-0.40',
            'recovery_months': 48,
            'applies_to': 'all',
            'start_date': 'next_month'
        }
    },

    # Inflation stress test
    'inflation_spike': {
        'name': 'Inflation Spike',
        'category': StressTestCategory.INFLATION,
        'description': 'Inflation rises to 6% for 24 months.',
        'severity': 'warning',
        'template_key': 'override_assumptions',
        'change_type': ChangeType.OVERRIDE_INFLATION,
        'default_inputs': {
            'inflation_rate': '0.06',
            'duration_months': 24,
            'start_date': 'next_month'
        }
    },
}


def get_stress_test_templates():
    """Return all stress test templates."""
    return STRESS_TESTS


def get_stress_test_by_key(key: str):
    """Get a specific stress test template by key."""
    return STRESS_TESTS.get(key)


def get_stress_tests_by_category(category: str):
    """Get stress tests filtered by category."""
    return {
        k: v for k, v in STRESS_TESTS.items()
        if v.get('category') == category
    }
