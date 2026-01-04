#!/usr/bin/env python3
"""
Validation script for Tasks 5 & 6 implementation.
Runs static checks without requiring database/Docker.
"""

import os
import sys
import ast
from pathlib import Path
from decimal import Decimal

# Color codes for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'


def check_file_exists(path: str) -> bool:
    """Check if a file exists."""
    exists = Path(path).is_file()
    status = f"{GREEN}✓{RESET}" if exists else f"{RED}✗{RESET}"
    print(f"  {status} {path}")
    return exists


def check_directory_exists(path: str) -> bool:
    """Check if a directory exists."""
    exists = Path(path).is_dir()
    status = f"{GREEN}✓{RESET}" if exists else f"{RED}✗{RESET}"
    print(f"  {status} {path}")
    return exists


def check_python_syntax(path: str) -> bool:
    """Check if Python file has valid syntax."""
    try:
        with open(path, 'r') as f:
            ast.parse(f.read())
        print(f"  {GREEN}✓{RESET} {path} - valid syntax")
        return True
    except SyntaxError as e:
        print(f"  {RED}✗{RESET} {path} - syntax error: {e}")
        return False
    except Exception as e:
        print(f"  {RED}✗{RESET} {path} - error: {e}")
        return False


def check_class_in_file(path: str, class_name: str) -> bool:
    """Check if a class is defined in a Python file."""
    try:
        with open(path, 'r') as f:
            tree = ast.parse(f.read())
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef) and node.name == class_name:
                print(f"  {GREEN}✓{RESET} {class_name} class defined in {path}")
                return True
        print(f"  {RED}✗{RESET} {class_name} class NOT found in {path}")
        return False
    except Exception as e:
        print(f"  {RED}✗{RESET} Error checking {class_name}: {e}")
        return False


def check_function_in_file(path: str, func_name: str) -> bool:
    """Check if a function is defined in a Python file."""
    try:
        with open(path, 'r') as f:
            tree = ast.parse(f.read())
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and node.name == func_name:
                print(f"  {GREEN}✓{RESET} {func_name} function defined in {path}")
                return True
        print(f"  {RED}✗{RESET} {func_name} function NOT found in {path}")
        return False
    except Exception as e:
        print(f"  {RED}✗{RESET} Error checking {func_name}: {e}")
        return False


def check_variable_in_file(path: str, var_name: str) -> bool:
    """Check if a variable is defined in a Python file."""
    try:
        with open(path, 'r') as f:
            content = f.read()
            tree = ast.parse(content)
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == var_name:
                        print(f"  {GREEN}✓{RESET} {var_name} variable defined in {path}")
                        return True
        print(f"  {RED}✗{RESET} {var_name} variable NOT found in {path}")
        return False
    except Exception as e:
        print(f"  {RED}✗{RESET} Error checking {var_name}: {e}")
        return False


def check_model_field(path: str, class_name: str, field_name: str) -> bool:
    """Check if a model has a specific field."""
    try:
        with open(path, 'r') as f:
            tree = ast.parse(f.read())
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef) and node.name == class_name:
                for item in node.body:
                    if isinstance(item, ast.Assign):
                        for target in item.targets:
                            if isinstance(target, ast.Name) and target.id == field_name:
                                print(f"  {GREEN}✓{RESET} {class_name}.{field_name} field exists")
                                return True
        print(f"  {RED}✗{RESET} {class_name}.{field_name} field NOT found")
        return False
    except Exception as e:
        print(f"  {RED}✗{RESET} Error checking field: {e}")
        return False


def check_installed_apps() -> bool:
    """Check if metrics and onboarding are in INSTALLED_APPS."""
    path = 'backend/config/settings/base.py'
    try:
        with open(path, 'r') as f:
            content = f.read()
        has_metrics = "'apps.metrics'" in content
        has_onboarding = "'apps.onboarding'" in content

        if has_metrics:
            print(f"  {GREEN}✓{RESET} apps.metrics in INSTALLED_APPS")
        else:
            print(f"  {RED}✗{RESET} apps.metrics NOT in INSTALLED_APPS")

        if has_onboarding:
            print(f"  {GREEN}✓{RESET} apps.onboarding in INSTALLED_APPS")
        else:
            print(f"  {RED}✗{RESET} apps.onboarding NOT in INSTALLED_APPS")

        return has_metrics and has_onboarding
    except Exception as e:
        print(f"  {RED}✗{RESET} Error checking INSTALLED_APPS: {e}")
        return False


def main():
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}Effluent.io - Tasks 5 & 6 Validation{RESET}")
    print(f"{BLUE}{'='*80}{RESET}\n")

    results = []

    # Task 5: Metrics App
    print(f"\n{YELLOW}Task 5: Financial Metrics and Insights{RESET}")
    print(f"{YELLOW}{'='*80}{RESET}\n")

    print("1. Directory Structure:")
    results.append(check_directory_exists('backend/apps/metrics'))

    print("\n2. File Existence:")
    results.append(check_file_exists('backend/apps/metrics/__init__.py'))
    results.append(check_file_exists('backend/apps/metrics/apps.py'))
    results.append(check_file_exists('backend/apps/metrics/models.py'))
    results.append(check_file_exists('backend/apps/metrics/services.py'))
    results.append(check_file_exists('backend/apps/metrics/admin.py'))

    print("\n3. Python Syntax:")
    results.append(check_python_syntax('backend/apps/metrics/apps.py'))
    results.append(check_python_syntax('backend/apps/metrics/models.py'))
    results.append(check_python_syntax('backend/apps/metrics/services.py'))
    results.append(check_python_syntax('backend/apps/metrics/admin.py'))

    print("\n4. Model Classes:")
    results.append(check_class_in_file('backend/apps/metrics/models.py', 'MetricSnapshot'))
    results.append(check_class_in_file('backend/apps/metrics/models.py', 'MetricThreshold'))
    results.append(check_class_in_file('backend/apps/metrics/models.py', 'Insight'))

    print("\n5. Service Classes:")
    results.append(check_class_in_file('backend/apps/metrics/services.py', 'MetricsCalculator'))
    results.append(check_class_in_file('backend/apps/metrics/services.py', 'InsightGenerator'))

    print("\n6. MetricSnapshot Key Fields:")
    results.append(check_model_field('backend/apps/metrics/models.py', 'MetricSnapshot', 'dscr'))
    results.append(check_model_field('backend/apps/metrics/models.py', 'MetricSnapshot', 'liquidity_months'))
    results.append(check_model_field('backend/apps/metrics/models.py', 'MetricSnapshot', 'savings_rate'))
    results.append(check_model_field('backend/apps/metrics/models.py', 'MetricSnapshot', 'dti_ratio'))
    results.append(check_model_field('backend/apps/metrics/models.py', 'MetricSnapshot', 'net_worth_market'))

    print("\n7. Constants and Defaults:")
    results.append(check_variable_in_file('backend/apps/metrics/models.py', 'DEFAULT_THRESHOLDS'))

    print("\n8. MetricsCalculator Methods:")
    results.append(check_function_in_file('backend/apps/metrics/services.py', 'calculate_all_metrics'))
    results.append(check_function_in_file('backend/apps/metrics/services.py', '_calculate_dscr'))
    results.append(check_function_in_file('backend/apps/metrics/services.py', '_calculate_liquidity_months'))
    results.append(check_function_in_file('backend/apps/metrics/services.py', '_calculate_dti_ratio'))

    print("\n9. InsightGenerator Methods:")
    results.append(check_function_in_file('backend/apps/metrics/services.py', 'generate_insights'))
    results.append(check_function_in_file('backend/apps/metrics/services.py', '_check_threshold'))

    # Task 6: Onboarding
    print(f"\n{YELLOW}Task 6: Onboarding Wizard{RESET}")
    print(f"{YELLOW}{'='*80}{RESET}\n")

    print("10. Directory Structure:")
    results.append(check_directory_exists('backend/apps/onboarding'))

    print("\n11. File Existence:")
    results.append(check_file_exists('backend/apps/onboarding/__init__.py'))
    results.append(check_file_exists('backend/apps/onboarding/apps.py'))
    results.append(check_file_exists('backend/apps/onboarding/models.py'))
    results.append(check_file_exists('backend/apps/onboarding/services.py'))
    results.append(check_file_exists('backend/apps/onboarding/admin.py'))

    print("\n12. Python Syntax:")
    results.append(check_python_syntax('backend/apps/onboarding/apps.py'))
    results.append(check_python_syntax('backend/apps/onboarding/models.py'))
    results.append(check_python_syntax('backend/apps/onboarding/services.py'))
    results.append(check_python_syntax('backend/apps/onboarding/admin.py'))

    print("\n13. Model Classes:")
    results.append(check_class_in_file('backend/apps/onboarding/models.py', 'OnboardingStep'))
    results.append(check_class_in_file('backend/apps/onboarding/models.py', 'OnboardingProgress'))
    results.append(check_class_in_file('backend/apps/onboarding/models.py', 'OnboardingStepData'))

    print("\n14. Service Classes:")
    results.append(check_class_in_file('backend/apps/onboarding/services.py', 'OnboardingService'))

    print("\n15. OnboardingProgress Key Fields:")
    results.append(check_model_field('backend/apps/onboarding/models.py', 'OnboardingProgress', 'current_step'))
    results.append(check_model_field('backend/apps/onboarding/models.py', 'OnboardingProgress', 'completed_steps'))
    results.append(check_model_field('backend/apps/onboarding/models.py', 'OnboardingProgress', 'skipped_steps'))

    print("\n16. OnboardingStepData Key Fields:")
    results.append(check_model_field('backend/apps/onboarding/models.py', 'OnboardingStepData', 'data'))
    results.append(check_model_field('backend/apps/onboarding/models.py', 'OnboardingStepData', 'is_valid'))
    results.append(check_model_field('backend/apps/onboarding/models.py', 'OnboardingStepData', 'validation_errors'))

    print("\n17. Constants:")
    results.append(check_variable_in_file('backend/apps/onboarding/models.py', 'ONBOARDING_FLOW'))
    results.append(check_variable_in_file('backend/apps/onboarding/models.py', 'SKIPPABLE_STEPS'))

    print("\n18. OnboardingService Methods:")
    results.append(check_function_in_file('backend/apps/onboarding/services.py', 'get_current_step'))
    results.append(check_function_in_file('backend/apps/onboarding/services.py', 'save_draft'))
    results.append(check_function_in_file('backend/apps/onboarding/services.py', 'complete_step'))
    results.append(check_function_in_file('backend/apps/onboarding/services.py', 'skip_step'))
    results.append(check_function_in_file('backend/apps/onboarding/services.py', 'go_back'))

    # Configuration
    print(f"\n{YELLOW}Configuration Checks{RESET}")
    print(f"{YELLOW}{'='*80}{RESET}\n")

    print("19. Django Settings:")
    results.append(check_installed_apps())

    # Summary
    print(f"\n{BLUE}{'='*80}{RESET}")
    print(f"{BLUE}Validation Summary{RESET}")
    print(f"{BLUE}{'='*80}{RESET}\n")

    total = len(results)
    passed = sum(results)
    failed = total - passed

    if failed == 0:
        print(f"{GREEN}✓ All {total} checks passed!{RESET}")
        print(f"\n{GREEN}Tasks 5 & 6 Implementation: COMPLETE ✓{RESET}\n")
        return 0
    else:
        print(f"{RED}✗ {failed}/{total} checks failed{RESET}")
        print(f"{GREEN}✓ {passed}/{total} checks passed{RESET}")
        print(f"\n{RED}Tasks 5 & 6 Implementation: INCOMPLETE{RESET}\n")
        return 1


if __name__ == '__main__':
    sys.exit(main())
