"""
Custom exception handlers for standardized API error responses.

This module provides a custom exception handler that ensures all API errors
are returned in a consistent format:

{
    "error": {
        "code": "error_code",
        "detail": "Human-readable error message",
        "fields": {
            "field_name": ["error message", ...]
        }
    }
}

This format makes it easy for frontend code to:
1. Identify the error type via code
2. Display the human-readable detail message
3. Map field errors to form fields
"""
import logging
from rest_framework import status
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.exceptions import (
    APIException,
    ValidationError,
    AuthenticationFailed,
    NotAuthenticated,
    PermissionDenied,
    NotFound,
    MethodNotAllowed,
    Throttled,
)
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404

logger = logging.getLogger(__name__)


# Map exception classes to error codes
ERROR_CODES = {
    ValidationError: 'validation_error',
    AuthenticationFailed: 'authentication_failed',
    NotAuthenticated: 'not_authenticated',
    PermissionDenied: 'permission_denied',
    NotFound: 'not_found',
    MethodNotAllowed: 'method_not_allowed',
    Throttled: 'rate_limited',
}


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns standardized error responses.

    This handler wraps DRF's default exception handling and transforms
    the response into a consistent format.

    Args:
        exc: The exception that was raised.
        context: Additional context (view, request, etc.)

    Returns:
        Response with standardized error format.
    """
    # Let DRF handle the exception first
    response = drf_exception_handler(exc, context)

    # If DRF didn't handle it, it's an unhandled exception
    if response is None:
        # Handle Django exceptions
        if isinstance(exc, Http404):
            return _create_error_response(
                code='not_found',
                detail='The requested resource was not found.',
                status_code=status.HTTP_404_NOT_FOUND
            )
        elif isinstance(exc, DjangoPermissionDenied):
            return _create_error_response(
                code='permission_denied',
                detail=str(exc) if str(exc) else 'You do not have permission to perform this action.',
                status_code=status.HTTP_403_FORBIDDEN
            )

        # Log unhandled exceptions
        logger.exception(f"Unhandled exception: {exc}")
        return _create_error_response(
            code='server_error',
            detail='An unexpected error occurred. Please try again later.',
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Transform the response to our standard format
    error_response = _transform_response(exc, response)

    return error_response


def _transform_response(exc, response):
    """
    Transform a DRF response into our standardized error format.

    Args:
        exc: The original exception.
        response: The DRF response object.

    Returns:
        Modified response with standardized format.
    """
    # Get error code
    error_code = getattr(exc, 'default_code', None) or getattr(exc, 'code', None)
    if not error_code:
        error_code = ERROR_CODES.get(type(exc), 'error')

    # Handle ValidationError specially to extract field errors
    if isinstance(exc, ValidationError):
        error_data = _handle_validation_error(exc, response.data)
    else:
        error_data = _handle_generic_error(exc, response.data, error_code)

    response.data = error_data
    return response


def _handle_validation_error(exc, data):
    """
    Handle validation errors and extract field-level errors.

    Args:
        exc: The ValidationError exception.
        data: The original response data.

    Returns:
        Standardized error response dict.
    """
    fields = {}
    non_field_errors = []

    if isinstance(data, dict):
        for key, value in data.items():
            # Flatten nested error messages
            errors = _flatten_errors(value)

            if key in ('non_field_errors', 'detail'):
                non_field_errors.extend(errors)
            else:
                fields[key] = errors
    elif isinstance(data, list):
        non_field_errors = _flatten_errors(data)
    elif isinstance(data, str):
        non_field_errors = [data]

    # Build detail message
    if non_field_errors:
        detail = non_field_errors[0]  # Use first non-field error as main message
    elif fields:
        # Use first field error as main message
        first_field = list(fields.keys())[0]
        detail = f"{first_field}: {fields[first_field][0]}"
    else:
        detail = 'Validation error'

    error_response = {
        'error': {
            'code': 'validation_error',
            'detail': detail,
        }
    }

    if fields:
        error_response['error']['fields'] = fields

    if len(non_field_errors) > 1:
        error_response['error']['non_field_errors'] = non_field_errors

    return error_response


def _handle_generic_error(exc, data, error_code):
    """
    Handle generic (non-validation) errors.

    Args:
        exc: The exception.
        data: The original response data.
        error_code: The error code to use.

    Returns:
        Standardized error response dict.
    """
    # Extract detail message
    if isinstance(data, dict):
        detail = data.get('detail', str(exc))
    elif isinstance(data, str):
        detail = data
    else:
        detail = str(exc)

    return {
        'error': {
            'code': error_code,
            'detail': detail,
        }
    }


def _flatten_errors(value):
    """
    Flatten nested error messages into a list of strings.

    Args:
        value: Error value (can be string, list, dict, etc.)

    Returns:
        List of error message strings.
    """
    if isinstance(value, str):
        return [value]
    elif isinstance(value, list):
        result = []
        for item in value:
            result.extend(_flatten_errors(item))
        return result
    elif isinstance(value, dict):
        # For nested objects, join with field path
        result = []
        for key, val in value.items():
            nested = _flatten_errors(val)
            for msg in nested:
                result.append(f"{key}: {msg}")
        return result
    else:
        return [str(value)]


def _create_error_response(code, detail, status_code):
    """
    Create a standardized error response.

    Args:
        code: Error code string.
        detail: Human-readable error message.
        status_code: HTTP status code.

    Returns:
        Response object with error data.
    """
    from rest_framework.response import Response

    return Response(
        {
            'error': {
                'code': code,
                'detail': detail,
            }
        },
        status=status_code
    )


class APIError(APIException):
    """
    Base class for custom API errors.

    Usage:
        raise APIError('Something went wrong', code='my_error')

        # Or with custom status code:
        raise APIError('Not allowed', code='forbidden', status_code=403)
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'An error occurred'
    default_code = 'error'

    def __init__(self, detail=None, code=None, status_code=None):
        if detail is not None:
            self.detail = detail
        else:
            self.detail = self.default_detail

        if code is not None:
            self.default_code = code

        if status_code is not None:
            self.status_code = status_code

        super().__init__(detail=self.detail, code=self.default_code)


class HouseholdError(APIError):
    """Error related to household context."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Household context is required'
    default_code = 'household_required'


class ResourceNotFoundError(APIError):
    """Error when a resource is not found."""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Resource not found'
    default_code = 'not_found'


class BusinessRuleError(APIError):
    """Error when a business rule is violated."""
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = 'Business rule violation'
    default_code = 'business_rule_violation'
