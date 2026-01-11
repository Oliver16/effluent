/**
 * Server-side control plane data fetching
 *
 * Uses cookies() for auth and transforms responses to camelCase.
 * This is a SERVER-ONLY file - uses next/headers.
 */
import { cookies } from 'next/headers';
import type {
  MetricSnapshot,
  Account,
  Insight,
  Scenario,
  ScenarioProjection,
  GoalStatusResult,
  DataQualityResponse,
} from '@/lib/types';

// API base URL for server-side requests
// In production, INTERNAL_API_URL must be set. The http:// fallback is only for local development.
// IMPORTANT: Only use INTERNAL_API_URL - NEXT_PUBLIC_API_URL could leak HTTP URLs to browsers.
function getApiUrl(): string {
  if (process.env.INTERNAL_API_URL) {
    return process.env.INTERNAL_API_URL;
  }

  // Warn if NEXT_PUBLIC_API_URL is set - it's not needed for server-side requests
  if (process.env.NEXT_PUBLIC_API_URL) {
    console.warn(
      '[Control Plane API] NEXT_PUBLIC_API_URL is set but should not be used. ' +
      'Set INTERNAL_API_URL for server-side API calls.'
    );
  }

  // Only allow localhost fallback in development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8000';
  }

  // In production, this would cause mixed content issues - fail fast
  console.error('[Control Plane API] CRITICAL: No INTERNAL_API_URL configured. This is required in production.');
  throw new Error('INTERNAL_API_URL must be set in production');
}

const API_URL = getApiUrl();

/**
 * Attempt to refresh the access token using the refresh token.
 * Returns the new access token or null if refresh failed.
 */
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch(`${API_URL}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      console.error('[Token Refresh] Failed:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    return data.access || null;
  } catch (error) {
    console.error('[Token Refresh] Error:', error);
    return null;
  }
}

/**
 * Convert snake_case to camelCase
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Recursively transform all snake_case keys in an object to camelCase.
 */
function toCamelCase<T>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item)) as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const camelKey = snakeToCamel(key);
      result[camelKey] = toCamelCase(value);
    }
    return result as T;
  }

  return obj as T;
}

/**
 * Server-side fetch with auth from cookies
 * Handles 401 errors by attempting token refresh
 */
async function serverFetch<T>(path: string, isRetry = false): Promise<T> {
  const cookieStore = await cookies();

  // Get auth tokens from cookies
  const token = cookieStore.get('token')?.value;
  const refreshToken = cookieStore.get('refreshToken')?.value;
  const householdId = cookieStore.get('householdId')?.value;

  // Debug logging for troubleshooting
  const hasToken = !!token;
  const hasRefreshToken = !!refreshToken;
  const hasHouseholdId = !!householdId;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (householdId) {
    headers['X-Household-ID'] = householdId;
  }

  const url = `${API_URL}${path}`;

  try {
    const res = await fetch(url, {
      headers,
      cache: 'no-store', // Always fresh data for control plane
    });

    // Handle 401 Unauthorized - try token refresh
    if (res.status === 401 && !isRetry && refreshToken) {
      console.log(`[Control Plane API] 401 on ${path}, attempting token refresh...`);
      const newToken = await refreshAccessToken(refreshToken);

      if (newToken) {
        // Note: We can't update cookies in a Server Component, but we can retry with the new token
        // The middleware should have handled this, but this is a fallback
        console.log(`[Control Plane API] Token refreshed, retrying ${path}...`);

        const retryHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newToken}`,
        };

        if (householdId) {
          retryHeaders['X-Household-ID'] = householdId;
        }

        const retryRes = await fetch(url, {
          headers: retryHeaders,
          cache: 'no-store',
        });

        if (retryRes.ok) {
          const data = await retryRes.json();
          return toCamelCase<T>(data);
        }

        // Retry also failed
        const errorBody = await retryRes.text().catch(() => 'Unable to read response body');
        console.error(`[Control Plane API Error] ${path} (after token refresh):`, {
          status: retryRes.status,
          statusText: retryRes.statusText,
          errorBody: errorBody.substring(0, 500),
        });
        throw new Error(`API error: ${retryRes.status} ${retryRes.statusText}`);
      } else {
        console.error(`[Control Plane API] Token refresh failed for ${path}`);
      }
    }

    if (!res.ok) {
      const errorBody = await res.text().catch(() => 'Unable to read response body');
      console.error(`[Control Plane API Error] ${path}:`, {
        status: res.status,
        statusText: res.statusText,
        hasToken,
        hasRefreshToken,
        hasHouseholdId,
        apiUrl: API_URL,
        errorBody: errorBody.substring(0, 500),
      });
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    return toCamelCase<T>(data);
  } catch (error) {
    // Log network errors or other failures
    if (error instanceof Error && !error.message.startsWith('API error:')) {
      console.error(`[Control Plane API Network Error] ${path}:`, {
        error: error.message,
        hasToken,
        hasRefreshToken,
        hasHouseholdId,
        apiUrl: API_URL,
      });
    }
    throw error;
  }
}

/**
 * Normalize list responses (handles both arrays and paginated objects)
 */
function normalizeListResponse<T>(data: T[] | { results: T[] } | undefined): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if ('results' in data) return data.results || [];
  return [];
}

/**
 * Control plane data shape
 */
export interface ControlPlaneData {
  metrics: MetricSnapshot | null;
  history: MetricSnapshot[];
  accounts: Account[];
  insights: Insight[];
  baseline: {
    scenario: Scenario;
    projections: ScenarioProjection[];
    health: {
      baselineId: string;
      baselineMode: string;
      metrics: Record<string, { value: string; trend: string | null }> | null;
    };
  } | null;
  goalStatus: GoalStatusResult[];
  dataQuality: DataQualityResponse | null;
}

/**
 * Fetch all control plane data server-side
 */
export async function getControlPlaneData(): Promise<ControlPlaneData> {
  try {
    // Fetch all data in parallel
    const [
      metricsData,
      historyData,
      accountsData,
      insightsData,
      baselineData,
      goalStatusData,
      dataQualityData,
    ] = await Promise.all([
      serverFetch<MetricSnapshot>('/api/v1/metrics/current/').catch(() => null),
      serverFetch<{ results: MetricSnapshot[] }>('/api/v1/metrics/history/?days=90').catch(() => ({ results: [] })),
      serverFetch<{ results: Account[] } | Account[]>('/api/v1/accounts/').catch(() => ({ results: [] })),
      serverFetch<{ results: Insight[] } | Insight[]>('/api/v1/insights/').catch(() => []),
      serverFetch<{
        baseline: Scenario;
        health: {
          baselineId: string;
          baselineMode: string;
          metrics: Record<string, { value: string; trend: string | null }> | null;
        };
      }>('/api/v1/scenarios/baseline/').catch(() => null),
      serverFetch<{ results: GoalStatusResult[] }>('/api/v1/goals/status/').catch(() => ({ results: [] })),
      serverFetch<DataQualityResponse>('/api/v1/metrics/data-quality/').catch(() => null),
    ]);

    // Normalize account and insights data
    const accountsNormalized = normalizeListResponse(accountsData);
    const insightsNormalized = normalizeListResponse(insightsData);

    return {
      metrics: metricsData,
      history: historyData?.results || [],
      accounts: accountsNormalized,
      insights: insightsNormalized,
      baseline: baselineData ? {
        scenario: baselineData.baseline,
        projections: baselineData.baseline?.projections || [],
        health: baselineData.health,
      } : null,
      goalStatus: goalStatusData?.results || [],
      dataQuality: dataQualityData,
    };
  } catch (error) {
    console.error('Control plane data fetch error:', error);
    throw error;
  }
}
