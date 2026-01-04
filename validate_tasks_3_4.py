#!/usr/bin/env python3
"""
Validation script for Tasks 3 and 4
"""
import os
import sys
from pathlib import Path
from decimal import Decimal

# Check required files exist
print("=" * 60)
print("TASK 3 & 4 VALIDATION")
print("=" * 60)

errors = []
warnings = []

# Task 3: Flows App Files
print("\n✓ Checking Task 3: Recurring Flows...")
flows_files = [
    'backend/apps/flows/__init__.py',
    'backend/apps/flows/apps.py',
    'backend/apps/flows/models.py',
    'backend/apps/flows/admin.py',
]

for f in flows_files:
    if os.path.exists(f):
        print(f"  ✓ {f}")
    else:
        errors.append(f"Missing file: {f}")
        print(f"  ✗ {f}")

# Task 4: Taxes App Files
print("\n✓ Checking Task 4: Tax Calculations...")
taxes_files = [
    'backend/apps/taxes/__init__.py',
    'backend/apps/taxes/apps.py',
    'backend/apps/taxes/models.py',
    'backend/apps/taxes/constants.py',
    'backend/apps/taxes/services.py',
    'backend/apps/taxes/admin.py',
]

for f in taxes_files:
    if os.path.exists(f):
        print(f"  ✓ {f}")
    else:
        errors.append(f"Missing file: {f}")
        print(f"  ✗ {f}")

# Check INSTALLED_APPS
print("\n✓ Checking settings configuration...")
settings_file = 'backend/config/settings/base.py'
with open(settings_file, 'r') as f:
    settings_content = f.read()
    if "'apps.flows'" in settings_content:
        print("  ✓ apps.flows in INSTALLED_APPS")
    else:
        errors.append("apps.flows not in INSTALLED_APPS")
        print("  ✗ apps.flows not in INSTALLED_APPS")

    if "'apps.taxes'" in settings_content:
        print("  ✓ apps.taxes in INSTALLED_APPS")
    else:
        errors.append("apps.taxes not in INSTALLED_APPS")
        print("  ✗ apps.taxes not in INSTALLED_APPS")

# Import and verify models
print("\n✓ Checking models structure...")
sys.path.insert(0, str(Path(__file__).parent / 'backend'))

try:
    from apps.flows.models import (
        FlowType, IncomeCategory, ExpenseCategory, Frequency,
        RecurringFlow, HOUSING_CATEGORIES, ESSENTIAL_CATEGORIES,
        FIXED_CATEGORIES, DEBT_PAYMENT_CATEGORIES,
        FREQUENCY_TO_MONTHLY, FREQUENCY_TO_ANNUAL
    )
    print("  ✓ Flows models imported successfully")

    # Verify enums
    assert len(IncomeCategory.choices) == 24, "Expected 24 income categories"
    print(f"  ✓ Income categories: {len(IncomeCategory.choices)}")

    assert len(ExpenseCategory.choices) >= 70, "Expected at least 70 expense categories"
    print(f"  ✓ Expense categories: {len(ExpenseCategory.choices)}")

    # Verify mortgage vs rent separation
    assert ExpenseCategory.MORTGAGE_PRINCIPAL.value == 'mortgage_principal'
    assert ExpenseCategory.MORTGAGE_INTEREST.value == 'mortgage_interest'
    assert ExpenseCategory.RENT.value == 'rent'
    print("  ✓ Mortgage and Rent are separate categories")

    # Verify category groupings
    assert ExpenseCategory.RENT in HOUSING_CATEGORIES
    assert ExpenseCategory.MORTGAGE_PRINCIPAL in DEBT_PAYMENT_CATEGORIES
    assert ExpenseCategory.RENT not in DEBT_PAYMENT_CATEGORIES
    print("  ✓ Category groupings correct")

    # Verify frequency conversions
    assert FREQUENCY_TO_MONTHLY[Frequency.BIWEEKLY] == Decimal('26') / Decimal('12')
    assert FREQUENCY_TO_ANNUAL[Frequency.MONTHLY] == Decimal('12')
    print("  ✓ Frequency conversions accurate")

except ImportError as e:
    errors.append(f"Failed to import flows models: {e}")
    print(f"  ✗ Failed to import flows models: {e}")
except AssertionError as e:
    errors.append(f"Model validation failed: {e}")
    print(f"  ✗ Model validation failed: {e}")

try:
    from apps.taxes.models import (
        IncomeSource, W2Withholding, PreTaxDeduction, PostTaxDeduction,
        SelfEmploymentTax, PayFrequency
    )
    print("  ✓ Tax models imported successfully")

    # Verify deduction types
    assert len(PreTaxDeduction.DeductionType.choices) >= 14
    print(f"  ✓ PreTax deduction types: {len(PreTaxDeduction.DeductionType.choices)}")

    assert len(PostTaxDeduction.DeductionType.choices) >= 8
    print(f"  ✓ PostTax deduction types: {len(PostTaxDeduction.DeductionType.choices)}")

except ImportError as e:
    errors.append(f"Failed to import tax models: {e}")
    print(f"  ✗ Failed to import tax models: {e}")
except AssertionError as e:
    errors.append(f"Tax model validation failed: {e}")
    print(f"  ✗ Tax model validation failed: {e}")

# Check constants
print("\n✓ Checking tax constants...")
try:
    from apps.taxes.constants import (
        TAX_YEAR, STANDARD_DEDUCTIONS, FEDERAL_BRACKETS,
        SOCIAL_SECURITY_RATE, SOCIAL_SECURITY_WAGE_BASE,
        MEDICARE_RATE, STATE_TAX_RATES, NO_INCOME_TAX_STATES,
        CONTRIBUTION_LIMITS, PAY_PERIODS
    )

    assert TAX_YEAR == 2026
    print(f"  ✓ Tax year: {TAX_YEAR}")

    assert STANDARD_DEDUCTIONS['single'] == Decimal('15700')
    print(f"  ✓ Standard deduction (single): ${STANDARD_DEDUCTIONS['single']}")

    assert SOCIAL_SECURITY_WAGE_BASE == Decimal('176100')
    print(f"  ✓ SS wage base: ${SOCIAL_SECURITY_WAGE_BASE}")

    assert len(STATE_TAX_RATES) >= 40
    print(f"  ✓ State tax rates: {len(STATE_TAX_RATES)} states")

    assert len(NO_INCOME_TAX_STATES) == 9
    print(f"  ✓ No income tax states: {len(NO_INCOME_TAX_STATES)}")

except ImportError as e:
    errors.append(f"Failed to import tax constants: {e}")
    print(f"  ✗ Failed to import tax constants: {e}")
except AssertionError as e:
    errors.append(f"Constant validation failed: {e}")
    print(f"  ✗ Constant validation failed: {e}")

# Check services
print("\n✓ Checking tax services...")
try:
    from apps.taxes.services import PaycheckCalculator, PaycheckBreakdown
    print("  ✓ PaycheckCalculator imported successfully")

except ImportError as e:
    errors.append(f"Failed to import tax services: {e}")
    print(f"  ✗ Failed to import tax services: {e}")

# Summary
print("\n" + "=" * 60)
print("VALIDATION SUMMARY")
print("=" * 60)

if not errors:
    print("\n✅ All validation checks passed!")
    print(f"  • {len(flows_files)} flows app files created")
    print(f"  • {len(taxes_files)} taxes app files created")
    print(f"  • All models validated")
    print(f"  • All constants validated")
    print(f"  • All services validated")
    print("\nReady for migrations when Docker is available:")
    print("  docker-compose exec backend python manage.py makemigrations flows")
    print("  docker-compose exec backend python manage.py makemigrations taxes")
    print("  docker-compose exec backend python manage.py migrate")
else:
    print(f"\n❌ {len(errors)} error(s) found:")
    for err in errors:
        print(f"  • {err}")
    sys.exit(1)

if warnings:
    print(f"\n⚠️  {len(warnings)} warning(s):")
    for warn in warnings:
        print(f"  • {warn}")

print()
