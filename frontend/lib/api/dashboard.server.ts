/**
 * Server-side dashboard data fetching
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
const API_URL = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
 */
async function serverFetch<T>(path: string): Promise<T> {
  const cookieStore = await cookies();

  // Get auth token from cookie or localStorage equivalent
  const token = cookieStore.get('token')?.value;
  const householdId = cookieStore.get('householdId')?.value;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (householdId) {
    headers['X-Household-ID'] = householdId;
  }

  const res = await fetch(`${API_URL}${path}`, {
    headers,
    cache: 'no-store', // Always fresh data for dashboard
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return toCamelCase<T>(data);
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
 * Dashboard data shape
 */
export interface DashboardData {
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
 * Fetch all dashboard data server-side
 */
export async function getDashboardData(): Promise<DashboardData> {
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
      serverFetch<{ results: Insight[] }>('/api/v1/insights/').catch(() => ({ results: [] })),
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

    // Normalize account data
    const accountsNormalized = normalizeListResponse(accountsData);

    return {
      metrics: metricsData,
      history: historyData?.results || [],
      accounts: accountsNormalized,
      insights: insightsData?.results || [],
      baseline: baselineData ? {
        scenario: baselineData.baseline,
        projections: baselineData.baseline?.projections || [],
        health: baselineData.health,
      } : null,
      goalStatus: goalStatusData?.results || [],
      dataQuality: dataQualityData,
    };
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    throw error;
  }
}
