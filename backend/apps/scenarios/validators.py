"""
Parameter validators for scenario changes.

Each ChangeType has specific parameter requirements that are validated here.
"""
from decimal import Decimal, InvalidOperation
from django.core.exceptions import ValidationError
from .models import ChangeType


# Define required and optional parameters for each change type
CHANGE_TYPE_SCHEMAS = {
    ChangeType.ADD_INCOME: {
        'required': ['amount', 'frequency', 'category'],
        'optional': ['tax_treatment', 'start_date', 'end_date'],
        'types': {
            'amount': (int, float, Decimal, str),
            'frequency': str,
            'category': str,
            'tax_treatment': str,
        }
    },
    ChangeType.MODIFY_INCOME: {
        'required': [],  # source_flow_id is on the change model itself
        'optional': ['amount', 'frequency', 'category', 'tax_treatment'],
        'types': {
            'amount': (int, float, Decimal, str),
            'frequency': str,
            'category': str,
            'tax_treatment': str,
        },
        'requires_source': True,
    },
    ChangeType.REMOVE_INCOME: {
        'required': [],
        'optional': [],
        'requires_source': True,
    },
    ChangeType.ADD_EXPENSE: {
        'required': ['amount', 'frequency', 'category'],
        'optional': ['start_date', 'end_date'],
        'types': {
            'amount': (int, float, Decimal, str),
            'frequency': str,
            'category': str,
        }
    },
    ChangeType.MODIFY_EXPENSE: {
        'required': [],
        'optional': ['amount', 'frequency', 'category'],
        'types': {
            'amount': (int, float, Decimal, str),
            'frequency': str,
            'category': str,
        },
        'requires_source': True,
    },
    ChangeType.REMOVE_EXPENSE: {
        'required': [],
        'optional': [],
        'requires_source': True,
    },
    ChangeType.ADD_DEBT: {
        'required': ['principal', 'rate', 'term_months'],
        'optional': ['payment'],
        'types': {
            'principal': (int, float, Decimal, str),
            'rate': (int, float, Decimal, str),
            'term_months': int,
            'payment': (int, float, Decimal, str),
        }
    },
    ChangeType.MODIFY_DEBT: {
        'required': [],
        'optional': ['principal', 'rate', 'term_months', 'payment'],
        'types': {
            'principal': (int, float, Decimal, str),
            'rate': (int, float, Decimal, str),
            'term_months': int,
            'payment': (int, float, Decimal, str),
        },
        'requires_source_account': True,
    },
    ChangeType.PAYOFF_DEBT: {
        'required': ['extra_monthly'],
        'optional': [],
        'types': {
            'extra_monthly': (int, float, Decimal, str),
        },
        'requires_source_account': True,
    },
    ChangeType.REFINANCE: {
        'required': ['rate', 'term_months'],
        'optional': ['closing_costs'],
        'types': {
            'rate': (int, float, Decimal, str),
            'term_months': int,
            'closing_costs': (int, float, Decimal, str),
        },
        'requires_source_account': True,
    },
    ChangeType.ADD_ASSET: {
        'required': ['value'],
        'optional': ['account_type', 'amount'],
        'types': {
            'value': (int, float, Decimal, str),
            'amount': (int, float, Decimal, str),
            'account_type': str,
        }
    },
    ChangeType.MODIFY_ASSET: {
        'required': [],
        'optional': ['value', 'amount'],
        'types': {
            'value': (int, float, Decimal, str),
            'amount': (int, float, Decimal, str),
        },
        'requires_source_account': True,
    },
    ChangeType.SELL_ASSET: {
        'required': [],
        'optional': ['sale_price', 'selling_costs'],
        'types': {
            'sale_price': (int, float, Decimal, str),
            'selling_costs': (int, float, Decimal, str),
        },
        'requires_source_account': True,
    },
    ChangeType.LUMP_SUM_INCOME: {
        'required': ['amount'],
        'optional': ['tax_treatment'],
        'types': {
            'amount': (int, float, Decimal, str),
            'tax_treatment': str,
        }
    },
    ChangeType.LUMP_SUM_EXPENSE: {
        'required': ['amount'],
        'optional': [],
        'types': {
            'amount': (int, float, Decimal, str),
        }
    },
    ChangeType.MODIFY_401K: {
        'required': ['percentage'],
        'optional': [],
        'types': {
            'percentage': (int, float, Decimal, str),
        },
        'requires_source': True,  # Required to identify which income source to modify (multi-job support)
    },
    ChangeType.MODIFY_HSA: {
        'required': ['percentage'],
        'optional': [],
        'types': {
            'percentage': (int, float, Decimal, str),
        },
        'requires_source': True,  # Required to identify which income source to modify (multi-job support)
    },
    ChangeType.ADJUST_TOTAL_EXPENSES: {
        'required': [],
        'optional': ['amount', 'mode', 'monthly_adjustment', 'description', 'category'],
        'types': {
            'amount': (int, float, Decimal, str),
            'mode': str,
            'monthly_adjustment': (int, float, Decimal, str),
            'description': str,
            'category': str,
        }
    },
    ChangeType.ADJUST_TOTAL_INCOME: {
        'required': [],
        'optional': ['amount', 'mode', 'monthly_adjustment', 'description', 'tax_treatment'],
        'types': {
            'amount': (int, float, Decimal, str),
            'mode': str,
            'monthly_adjustment': (int, float, Decimal, str),
            'description': str,
            'tax_treatment': str,
        }
    },
    ChangeType.SET_SAVINGS_TRANSFER: {
        'required': ['amount'],
        'optional': ['target_account_id'],
        'types': {
            'amount': (int, float, Decimal, str),
            'target_account_id': str,
        }
    },
    ChangeType.OVERRIDE_ASSUMPTIONS: {
        'required': [],
        'optional': ['inflation_rate', 'investment_return_rate', 'salary_growth_rate'],
        'types': {
            'inflation_rate': (int, float, Decimal, str),
            'investment_return_rate': (int, float, Decimal, str),
            'salary_growth_rate': (int, float, Decimal, str),
        }
    },
    ChangeType.ADJUST_INTEREST_RATES: {
        'required': ['adjustment_percent'],
        'optional': ['applies_to'],
        'types': {
            'adjustment_percent': (int, float, Decimal, str),
            'applies_to': str,
        }
    },
    ChangeType.ADJUST_INVESTMENT_VALUE: {
        'required': ['percent_change'],
        'optional': ['applies_to', 'recovery_months'],
        'types': {
            'percent_change': (int, float, Decimal, str),
            'applies_to': str,
            'recovery_months': int,
        }
    },
    ChangeType.OVERRIDE_INFLATION: {
        'required': ['rate'],
        'optional': ['duration_months', 'inflation_rate'],
        'types': {
            'rate': (int, float, Decimal, str),
            'inflation_rate': (int, float, Decimal, str),
            'duration_months': int,
        }
    },
    ChangeType.OVERRIDE_INVESTMENT_RETURN: {
        'required': ['rate'],
        'optional': [],
        'types': {
            'rate': (int, float, Decimal, str),
        }
    },
    ChangeType.OVERRIDE_SALARY_GROWTH: {
        'required': ['rate'],
        'optional': [],
        'types': {
            'rate': (int, float, Decimal, str),
        }
    },
    ChangeType.MODIFY_WITHHOLDING: {
        'required': ['extra_monthly'],
        'optional': [],
        'types': {
            'extra_monthly': (int, float, Decimal, str),
        }
    },
    ChangeType.SET_QUARTERLY_ESTIMATES: {
        'required': ['quarterly_amount'],
        'optional': [],
        'types': {
            'quarterly_amount': (int, float, Decimal, str),
        }
    },
}


def validate_scenario_change_parameters(change_type: str, parameters: dict, source_flow_id: str = None, source_account_id: str = None):
    """
    Validate that parameters match the expected schema for the given change type.

    Args:
        change_type: The ChangeType value
        parameters: The parameters dict to validate
        source_flow_id: Optional source_flow_id from the change model
        source_account_id: Optional source_account_id from the change model

    Raises:
        ValidationError: If parameters don't match the expected schema
    """
    if change_type not in CHANGE_TYPE_SCHEMAS:
        # Unknown change type - allow it for forward compatibility
        return

    schema = CHANGE_TYPE_SCHEMAS[change_type]

    # Check if this change type requires a source reference
    if schema.get('requires_source') and not source_flow_id:
        raise ValidationError(
            f"{change_type} requires a source_flow_id"
        )

    if schema.get('requires_source_account') and not source_account_id:
        raise ValidationError(
            f"{change_type} requires a source_account_id"
        )

    # Check required parameters
    required = schema.get('required', [])
    for param in required:
        if param not in parameters:
            raise ValidationError(
                f"Missing required parameter '{param}' for change type {change_type}"
            )

    # Check parameter types
    types_schema = schema.get('types', {})
    for param, value in parameters.items():
        if param in types_schema:
            expected_types = types_schema[param]
            if not isinstance(expected_types, tuple):
                expected_types = (expected_types,)

            if not isinstance(value, expected_types):
                # Try to convert numeric strings to appropriate types
                if Decimal in expected_types or float in expected_types or int in expected_types:
                    try:
                        Decimal(str(value))
                    except (InvalidOperation, ValueError, TypeError):
                        raise ValidationError(
                            f"Parameter '{param}' must be numeric, got {type(value).__name__}"
                        )
                else:
                    raise ValidationError(
                        f"Parameter '{param}' has wrong type. Expected {expected_types}, got {type(value).__name__}"
                    )

    # Warn about unexpected parameters (not an error, but could indicate a bug)
    allowed = set(required + schema.get('optional', []))
    unexpected = set(parameters.keys()) - allowed
    if unexpected:
        # Log warning but don't raise error (allow extra parameters for forward compatibility)
        pass


def validate_frequency(frequency: str):
    """
    Validate that a frequency value is valid.

    Args:
        frequency: The frequency string to validate

    Raises:
        ValidationError: If frequency is not valid
    """
    from apps.flows.models import Frequency

    valid_frequencies = [f.value for f in Frequency]
    if frequency not in valid_frequencies:
        raise ValidationError(
            f"Invalid frequency '{frequency}'. Must be one of: {', '.join(valid_frequencies)}"
        )


def validate_numeric_positive(value, param_name: str):
    """
    Validate that a numeric parameter is positive.

    Args:
        value: The value to validate
        param_name: Name of the parameter for error messages

    Raises:
        ValidationError: If value is not a positive number
    """
    try:
        numeric_value = Decimal(str(value))
        if numeric_value < 0:
            raise ValidationError(
                f"Parameter '{param_name}' must be positive, got {numeric_value}"
            )
    except (InvalidOperation, ValueError, TypeError):
        raise ValidationError(
            f"Parameter '{param_name}' must be a valid number"
        )


def validate_percentage(value, param_name: str):
    """
    Validate that a percentage parameter is in valid range (0-100 or as decimal 0-1).

    Args:
        value: The value to validate
        param_name: Name of the parameter for error messages

    Raises:
        ValidationError: If value is not a valid percentage
    """
    try:
        numeric_value = Decimal(str(value))
        # Allow both 0-100 range and 0-1 range
        if numeric_value < 0 or numeric_value > 100:
            raise ValidationError(
                f"Parameter '{param_name}' must be between 0 and 100, got {numeric_value}"
            )
    except (InvalidOperation, ValueError, TypeError):
        raise ValidationError(
            f"Parameter '{param_name}' must be a valid number"
        )
