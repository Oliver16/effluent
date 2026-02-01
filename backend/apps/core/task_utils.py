"""
Task utilities for Celery tasks.

Provides reusable decorators and utilities for task management including:
- Distributed locking to prevent concurrent execution
- Task deduplication
- Error handling patterns
- Task registration for household task tracking
"""
import logging
import functools
from typing import Optional, Callable, Any, List
from django.core.cache import cache

logger = logging.getLogger(__name__)

# Constants for task registry
TASK_REGISTRY_TTL = 3600  # 1 hour TTL for task registry
TASK_REGISTRY_MAX_SIZE = 50  # Max tasks to keep in registry per household


def register_task_for_household(task_id: str, household_id: str, task_name: str = None) -> None:
    """
    Register a task ID in the household's task registry.

    This allows the TaskManagementView to list all active tasks for a household.
    The registry has a max size limit to prevent unbounded growth.

    Args:
        task_id: The Celery task ID
        household_id: The household ID that owns this task
        task_name: Optional name of the task for display
    """
    registry_key = f'household_tasks:{household_id}'
    ownership_key = f'task_household:{task_id}'

    # Store task ownership (for security validation)
    cache.set(ownership_key, str(household_id), TASK_REGISTRY_TTL)

    # Get existing task registry
    task_registry = cache.get(registry_key, [])

    # Add new task to registry
    task_entry = {
        'task_id': task_id,
        'task_name': task_name,
    }
    task_registry.insert(0, task_entry)  # Add to beginning (most recent first)

    # Limit registry size to prevent unbounded growth
    if len(task_registry) > TASK_REGISTRY_MAX_SIZE:
        task_registry = task_registry[:TASK_REGISTRY_MAX_SIZE]

    # Save updated registry
    cache.set(registry_key, task_registry, TASK_REGISTRY_TTL)

    logger.debug(f"Registered task {task_id} for household {household_id}")


def unregister_task_for_household(task_id: str, household_id: str) -> None:
    """
    Remove a task from the household's task registry.

    Called when a task completes or is cleaned up.

    Args:
        task_id: The Celery task ID
        household_id: The household ID that owns this task
    """
    registry_key = f'household_tasks:{household_id}'
    ownership_key = f'task_household:{task_id}'

    # Remove task ownership
    cache.delete(ownership_key)

    # Remove from registry - handle both old format (list of strings) and new format (list of dicts)
    task_registry = cache.get(registry_key, [])
    new_registry = []
    for entry in task_registry:
        if isinstance(entry, dict):
            if entry.get('task_id') != task_id:
                new_registry.append(entry)
        elif isinstance(entry, str):
            # Legacy format: entry is just the task_id string
            if entry != task_id:
                new_registry.append(entry)
    cache.set(registry_key, new_registry, TASK_REGISTRY_TTL)

    logger.debug(f"Unregistered task {task_id} for household {household_id}")


class TaskLockError(Exception):
    """Raised when a task cannot acquire a lock."""
    pass


def with_task_lock(
    lock_key: str,
    timeout: int = 300,
    blocking: bool = False,
    skip_on_locked: bool = True
):
    """
    Decorator to add distributed locking to a Celery task.

    Prevents concurrent execution of the same task by acquiring a Redis lock.
    Useful for preventing race conditions in tasks that modify shared resources.

    Args:
        lock_key: Redis key for the lock. Can use {arg_name} placeholders that will
                  be replaced with task argument values (e.g., 'flow_regen:{household_id}')
        timeout: Lock timeout in seconds (default: 300 = 5 minutes)
        blocking: If True, wait for lock to be released. If False, fail immediately (default: False)
        skip_on_locked: If True, return success dict when locked. If False, raise TaskLockError (default: True)

    Returns:
        Decorated function that acquires lock before execution and releases after.

    Example:
        @shared_task(bind=True)
        @with_task_lock('flow_regen:{household_id}', timeout=300)
        def regenerate_flows_task(self, household_id):
            # This will only run if no other task holds the lock
            ...

    Raises:
        TaskLockError: If lock cannot be acquired and skip_on_locked=False
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Format lock key with task arguments
            # Support both positional and keyword arguments
            task_self = args[0] if args and hasattr(args[0], 'request') else None
            func_args = args[1:] if task_self else args

            # Build context for key formatting
            context = {}
            if func.__code__:
                arg_names = func.__code__.co_varnames[:func.__code__.co_argcount]
                # Skip 'self' if it's a bound task
                start_idx = 1 if arg_names and arg_names[0] == 'self' else 0
                for i, arg_name in enumerate(arg_names[start_idx:]):
                    if i < len(func_args):
                        context[arg_name] = func_args[i]
            context.update(kwargs)

            # Format the lock key
            formatted_key = lock_key.format(**context)

            # Try to acquire lock
            lock_acquired = cache.add(formatted_key, 'locked', timeout=timeout)

            if not lock_acquired:
                # Lock is already held
                logger.warning(
                    f"Task {func.__name__} cannot acquire lock '{formatted_key}' - "
                    f"another task is already running"
                )

                if skip_on_locked:
                    # Return success with skipped flag
                    return {
                        'skipped': True,
                        'reason': 'lock_held',
                        'lock_key': formatted_key
                    }
                else:
                    # Raise error to trigger retry logic
                    raise TaskLockError(
                        f"Cannot acquire lock '{formatted_key}' - task already running"
                    )

            # Lock acquired, execute task
            try:
                logger.info(f"Task {func.__name__} acquired lock '{formatted_key}'")
                result = func(*args, **kwargs)
                logger.info(f"Task {func.__name__} completed, releasing lock '{formatted_key}'")
                return result
            finally:
                # Always release lock, even if task fails
                cache.delete(formatted_key)

        return wrapper
    return decorator


def get_household_lock(household_id: str, operation: str, timeout: int = 300) -> Optional[bool]:
    """
    Manually acquire a distributed lock for a household operation.

    Use this for non-decorator locking patterns or when you need fine-grained control.

    Args:
        household_id: The household ID to lock
        operation: Description of operation (e.g., 'flow_regen', 'baseline_refresh')
        timeout: Lock timeout in seconds (default: 300 = 5 minutes)

    Returns:
        True if lock was acquired, False otherwise

    Example:
        if get_household_lock(household_id, 'reality_processing'):
            try:
                # Do work
                ...
            finally:
                release_household_lock(household_id, 'reality_processing')
    """
    lock_key = f'household_lock:{household_id}:{operation}'
    return cache.add(lock_key, 'locked', timeout=timeout)


def release_household_lock(household_id: str, operation: str) -> None:
    """
    Release a manually acquired household lock.

    Args:
        household_id: The household ID to unlock
        operation: Description of operation (must match the acquire call)
    """
    lock_key = f'household_lock:{household_id}:{operation}'
    cache.delete(lock_key)


def with_idempotency_key(
    key: str,
    ttl: int = 3600,
    result_on_duplicate: Optional[Any] = None
):
    """
    Decorator to add idempotency to a task using a cache key.

    Prevents duplicate execution of the same task within the TTL window.
    Useful for user-initiated tasks where double-clicking might dispatch multiple tasks.

    Args:
        key: Cache key for idempotency. Can use {arg_name} placeholders (e.g., 'baseline_refresh:{household_id}')
        ttl: Time to live for idempotency key in seconds (default: 3600 = 1 hour)
        result_on_duplicate: Result to return if duplicate detected (default: {'duplicate': True})

    Returns:
        Decorated function that checks idempotency before execution.

    Example:
        @shared_task(bind=True)
        @with_idempotency_key('baseline_refresh:{household_id}', ttl=3600)
        def refresh_baseline_task(self, household_id):
            # This will only run once per hour per household
            ...
    """
    if result_on_duplicate is None:
        result_on_duplicate = {'duplicate': True, 'skipped': True}

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Format idempotency key with task arguments
            task_self = args[0] if args and hasattr(args[0], 'request') else None
            func_args = args[1:] if task_self else args

            # Build context for key formatting
            context = {}
            if func.__code__:
                arg_names = func.__code__.co_varnames[:func.__code__.co_argcount]
                start_idx = 1 if arg_names and arg_names[0] == 'self' else 0
                for i, arg_name in enumerate(arg_names[start_idx:]):
                    if i < len(func_args):
                        context[arg_name] = func_args[i]
            context.update(kwargs)

            # Format the idempotency key
            formatted_key = f'idempotency:{key.format(**context)}'

            # Check if task already running or recently completed
            if cache.get(formatted_key):
                logger.info(
                    f"Task {func.__name__} skipped - duplicate detected (key: {formatted_key})"
                )
                return result_on_duplicate

            # Set idempotency key and execute task
            cache.set(formatted_key, 'running', ttl)

            try:
                result = func(*args, **kwargs)
                return result
            except Exception:
                # Remove idempotency key on failure so task can be retried
                cache.delete(formatted_key)
                raise

        return wrapper
    return decorator
