/**
 * Utilities for polling Celery task status and handling async operations.
 */

export interface TaskResponse {
  taskId: string;
  status: 'pending' | 'completed' | 'failed';
  result?: any;
  error?: string;
  state?: string;
  message?: string;
}

/**
 * Attempt to refresh the access token during polling.
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch('/api/auth/token/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.access) {
      localStorage.setItem('token', data.access);
      if (data.refresh) {
        localStorage.setItem('refreshToken', data.refresh);
      }
      return data.access;
    }
    return null;
  } catch {
    return null;
  }
}

export interface PollOptions {
  interval?: number; // Polling interval in ms (default: 1000)
  timeout?: number; // Max time to poll in ms (default: 300000 = 5 minutes)
  onProgress?: (status: TaskResponse, elapsedSeconds: number) => void;
}

/**
 * Poll a task status endpoint until the task completes or fails.
 *
 * @param taskId The Celery task ID
 * @param statusUrl The URL to poll for task status (e.g., '/api/v1/scenarios/tasks/{taskId}/')
 * @param options Polling options
 * @returns Promise that resolves with the task result or rejects with error
 */
export async function pollTaskStatus<T = any>(
  taskId: string,
  statusUrl: string,
  options: PollOptions = {}
): Promise<T> {
  const {
    interval = 1000, // Poll every 1 second
    timeout = 300000, // 5 minute timeout
    onProgress,
  } = options;

  const startTime = Date.now();
  const url = statusUrl.replace('{taskId}', taskId);

  return new Promise<T>((resolve, reject) => {
    const poll = async (isRetry = false) => {
      try {
        // Check if we've exceeded timeout
        if (Date.now() - startTime > timeout) {
          reject(new Error('Task polling timed out'));
          return;
        }

        // Build headers with authentication
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Add auth token if available
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Add household ID if available
        const householdId = typeof window !== 'undefined' ? localStorage.getItem('householdId') : null;
        if (householdId) {
          headers['X-Household-ID'] = householdId;
        }

        // Fetch task status
        const response = await fetch(url, {
          headers,
        });

        // Handle 401 Unauthorized - try to refresh token and retry once
        if (response.status === 401 && !isRetry && typeof window !== 'undefined') {
          const newToken = await refreshAccessToken();
          if (newToken) {
            // Retry with new token
            setTimeout(() => poll(true), 100);
            return;
          }
          // Refresh failed - user needs to log in again
          reject(new Error('Authentication expired. Please log in again.'));
          return;
        }

        if (!response.ok) {
          reject(new Error(`Failed to fetch task status: ${response.statusText}`));
          return;
        }

        const taskStatus: TaskResponse = await response.json();

        // Calculate elapsed time and call progress callback if provided
        if (onProgress) {
          const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
          onProgress(taskStatus, elapsedSeconds);
        }

        // Handle completed task
        if (taskStatus.status === 'completed') {
          resolve(taskStatus.result as T);
          return;
        }

        // Handle failed task
        if (taskStatus.status === 'failed') {
          reject(new Error(taskStatus.error || 'Task failed'));
          return;
        }

        // Task still pending, continue polling
        setTimeout(() => poll(false), interval);
      } catch (error) {
        reject(error);
      }
    };

    // Start polling
    poll(false);
  });
}

/**
 * Handle an API response that may be either synchronous or async (with task_id).
 *
 * @param response The API response
 * @param statusUrl The URL template for polling task status
 * @param options Polling options
 * @returns Promise that resolves with the final result
 */
export async function handleAsyncResponse<T = any>(
  response: any,
  statusUrl: string,
  options: PollOptions = {}
): Promise<T> {
  // If response has task_id, it's async - poll for completion
  if (response.taskId || response.task_id) {
    const taskId = response.taskId || response.task_id;

    // Add default progress handler if none provided (for console logging)
    const optionsWithProgress = {
      ...options,
      onProgress: options.onProgress || ((status: TaskResponse, elapsedSeconds: number) => {
        if (elapsedSeconds > 0 && elapsedSeconds % 5 === 0) {
          console.log(`Task ${taskId} still processing... (${elapsedSeconds}s elapsed)`);
        }
      })
    };

    return pollTaskStatus<T>(taskId, statusUrl, optionsWithProgress);
  }

  // Otherwise it's a synchronous response - return it directly
  return response as T;
}
