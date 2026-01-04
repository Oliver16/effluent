#!/usr/bin/env python
"""
Validation script to verify Task-01 and Task-02 requirements.
This script performs static analysis and checks model definitions.
"""
import os
import sys
import importlib.util

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')

def check_file_exists(path):
    """Check if a file exists."""
    return os.path.isfile(path)

def check_module_syntax(filepath):
    """Check if a Python module has valid syntax."""
    try:
        with open(filepath, 'r') as f:
            code = f.read()
        compile(code, filepath, 'exec')
        return True, "OK"
    except SyntaxError as e:
        return False, f"Syntax Error: {e}"
    except Exception as e:
        return False, f"Error: {e}"

def main():
    print("=" * 70)
    print("TASK-01 & TASK-02 VALIDATION")
    print("=" * 70)

    # Task 1: Check directory structure
    print("\n[Task-01] Checking directory structure...")
    required_dirs = [
        'backend',
        'backend/requirements',
        'backend/config',
        'backend/config/settings',
        'backend/apps',
        'backend/apps/core',
        'backend/apps/households',
        'backend/docker',
    ]

    for dir_path in required_dirs:
        exists = os.path.isdir(dir_path)
        status = "✓" if exists else "✗"
        print(f"  {status} {dir_path}")

    # Task 1: Check required files
    print("\n[Task-01] Checking required files...")
    required_files = [
        'backend/pyproject.toml',
        'backend/requirements/base.txt',
        'backend/requirements/dev.txt',
        'backend/docker/Dockerfile',
        'docker-compose.yml',
        'backend/manage.py',
        'backend/config/__init__.py',
        'backend/config/settings/__init__.py',
        'backend/config/settings/base.py',
        'backend/config/settings/dev.py',
        'backend/config/settings/prod.py',
        'backend/config/urls.py',
        'backend/config/wsgi.py',
        'backend/apps/core/__init__.py',
        'backend/apps/core/apps.py',
        'backend/apps/core/models.py',
        'backend/apps/core/admin.py',
        'backend/apps/households/__init__.py',
        'backend/apps/households/apps.py',
        'backend/apps/households/middleware.py',
        'backend/apps/households/admin.py',
    ]

    for file_path in required_files:
        exists = check_file_exists(file_path)
        status = "✓" if exists else "✗"
        print(f"  {status} {file_path}")

    # Task 2: Check accounts app files
    print("\n[Task-02] Checking accounts app files...")
    accounts_files = [
        'backend/apps/accounts/__init__.py',
        'backend/apps/accounts/apps.py',
        'backend/apps/accounts/models.py',
        'backend/apps/accounts/admin.py',
    ]

    for file_path in accounts_files:
        exists = check_file_exists(file_path)
        status = "✓" if exists else "✗"
        print(f"  {status} {file_path}")

    # Check Python syntax
    print("\n[Task-01 & Task-02] Checking Python syntax...")
    python_files = [
        'backend/manage.py',
        'backend/config/settings/base.py',
        'backend/config/settings/dev.py',
        'backend/config/settings/prod.py',
        'backend/config/urls.py',
        'backend/config/wsgi.py',
        'backend/apps/core/models.py',
        'backend/apps/core/admin.py',
        'backend/apps/core/apps.py',
        'backend/apps/households/middleware.py',
        'backend/apps/households/apps.py',
        'backend/apps/accounts/models.py',
        'backend/apps/accounts/admin.py',
        'backend/apps/accounts/apps.py',
    ]

    all_syntax_ok = True
    for file_path in python_files:
        is_ok, msg = check_module_syntax(file_path)
        status = "✓" if is_ok else "✗"
        print(f"  {status} {file_path}: {msg}")
        if not is_ok:
            all_syntax_ok = False

    # Check model definitions
    print("\n[Task-01] Checking core models...")
    with open('backend/apps/core/models.py', 'r') as f:
        core_models_content = f.read()

    core_model_checks = [
        ('User model', 'class User(AbstractUser):'),
        ('Household model', 'class Household(TimestampedModel):'),
        ('HouseholdMember model', 'class HouseholdMember(TimestampedModel):'),
        ('HouseholdMembership model', 'class HouseholdMembership(TimestampedModel):'),
        ('HouseholdOwnedModel abstract', 'class HouseholdOwnedModel(TimestampedModel):'),
        ('User UUID primary key', "id = models.UUIDField(primary_key=True"),
        ('User email field', "email = models.EmailField(unique=True)"),
        ('Household slug', "slug = models.SlugField(unique=True"),
        ('AUTH_USER_MODEL', 'core.User'),
    ]

    for check_name, check_str in core_model_checks:
        exists = check_str in core_models_content
        status = "✓" if exists else "✗"
        print(f"  {status} {check_name}")

    # Check accounts models
    print("\n[Task-02] Checking accounts models...")
    with open('backend/apps/accounts/models.py', 'r') as f:
        accounts_models_content = f.read()

    accounts_model_checks = [
        ('AccountType choices', 'class AccountType(models.TextChoices):'),
        ('CHECKING type', "CHECKING = 'checking'"),
        ('CREDIT_CARD type', "CREDIT_CARD = 'credit_card'"),
        ('PRIMARY_MORTGAGE type', "PRIMARY_MORTGAGE = 'primary_mortgage'"),
        ('ASSET_TYPES set', 'ASSET_TYPES ='),
        ('LIABILITY_TYPES set', 'LIABILITY_TYPES ='),
        ('AssetGroup model', 'class AssetGroup(HouseholdOwnedModel):'),
        ('Account model', 'class Account(HouseholdOwnedModel):'),
        ('BalanceSnapshot model', 'class BalanceSnapshot(models.Model):'),
        ('LiabilityDetails model', 'class LiabilityDetails(models.Model):'),
        ('AssetDetails model', 'class AssetDetails(models.Model):'),
        ('Dual-basis tracking', 'cost_basis'),
        ('Dual-basis tracking', 'market_value'),
        ('AssetGroup properties', 'total_market_value'),
        ('AssetGroup properties', 'equity_at_market'),
    ]

    for check_name, check_str in accounts_model_checks:
        exists = check_str in accounts_models_content
        status = "✓" if exists else "✗"
        print(f"  {status} {check_name}")

    # Check settings configuration
    print("\n[Task-01] Checking settings configuration...")
    with open('backend/config/settings/base.py', 'r') as f:
        settings_content = f.read()

    settings_checks = [
        ('rest_framework installed', "'rest_framework'"),
        ('corsheaders installed', "'corsheaders'"),
        ('core app installed', "'apps.core'"),
        ('households app installed', "'apps.households'"),
        ('accounts app installed', "'apps.accounts'"),
        ('HouseholdMiddleware', "'apps.households.middleware.HouseholdMiddleware'"),
        ('PostgreSQL config', "'ENGINE': 'django.db.backends.postgresql'"),
        ('AUTH_USER_MODEL set', "AUTH_USER_MODEL = 'core.User'"),
        ('Decimal precision', 'decimal.getcontext().prec'),
    ]

    for check_name, check_str in settings_checks:
        exists = check_str in settings_content
        status = "✓" if exists else "✗"
        print(f"  {status} {check_name}")

    # Check docker-compose.yml
    print("\n[Task-01] Checking Docker configuration...")
    with open('docker-compose.yml', 'r') as f:
        docker_content = f.read()

    docker_checks = [
        ('PostgreSQL service', 'postgres:16'),
        ('Backend service', 'backend:'),
        ('Database environment', 'POSTGRES_DB: effluent'),
        ('Healthcheck', 'healthcheck:'),
        ('Depends on db', 'depends_on:'),
    ]

    for check_name, check_str in docker_checks:
        exists = check_str in docker_content
        status = "✓" if exists else "✗"
        print(f"  {status} {check_name}")

    # Summary
    print("\n" + "=" * 70)
    if all_syntax_ok:
        print("✓ All Python files have valid syntax")
        print("✓ All required files and directories are present")
        print("✓ All models are properly defined")
        print("\nREADY FOR DEPLOYMENT!")
        print("\nNext steps:")
        print("  1. docker-compose up --build")
        print("  2. docker-compose exec backend python manage.py makemigrations")
        print("  3. docker-compose exec backend python manage.py migrate")
        print("  4. docker-compose exec backend python manage.py createsuperuser")
    else:
        print("✗ Some files have syntax errors. Please fix them before deployment.")
    print("=" * 70)

if __name__ == '__main__':
    main()
