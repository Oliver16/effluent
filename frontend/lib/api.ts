import type {
  Household,
  Account,
  RecurringFlow,
  MetricSnapshot,
  Insight,
  BalanceSnapshot,
  OnboardingStepResponse,
  Scenario,
  ScenarioChange,
  ScenarioProjection,
} from './types'

// API base URL - empty string for browser requests (uses Next.js rewrites for internal routing)
// Server-side requests use the configured URL directly
const API_BASE = typeof window === 'undefined'
  ? (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || '')
  : ''

interface RequestOptions extends RequestInit {
  data?: unknown
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public errors?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Normalize API responses that may be either an array or a paginated object with 'results'.
 * This handles both DRF paginated responses ({ results: [...] }) and direct array responses.
 */
export function normalizeListResponse<T>(data: T[] | { results: T[] } | { data: T[] } | undefined): T[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if ('results' in data) return data.results || []
  if ('data' in data) return data.data || []
  return []
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { data, ...fetchOptions } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  // Add existing headers
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers[key] = value
      }
    })
  }

  // Add auth token if available
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Add household ID if available
  const householdId = typeof window !== 'undefined' ? localStorage.getItem('householdId') : null
  if (householdId) {
    headers['X-Household-ID'] = householdId
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new ApiError(response.status, error.detail || 'Request failed', error.errors)
  }

  return response.json()
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'POST', data }),

  put: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PUT', data }),

  patch: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'PATCH', data }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
}

// Auth endpoints
export const auth = {
  login: (email: string, password: string) =>
    api.post<{ access: string; refresh: string }>('/api/auth/token/', { email, password }),

  refresh: (refreshToken: string) =>
    api.post<{ access: string }>('/api/auth/token/refresh/', { refresh: refreshToken }),
}

// Household endpoints
export const households = {
  list: () => api.get<Household[]>('/api/v1/households/'),
  get: (id: string) => api.get<Household>(`/api/v1/households/${id}/`),
  create: (data: Partial<Household>) => api.post<Household>('/api/v1/households/', data),
}

// Account endpoints
export const accounts = {
  list: () => api.get<{ results: Account[] }>('/api/v1/accounts/'),
  get: (id: string) => api.get<Account>(`/api/v1/accounts/${id}/`),
  create: (data: Partial<Account>) => api.post<Account>('/api/v1/accounts/', data),
  update: (id: string, data: Partial<Account>) => api.patch<Account>(`/api/v1/accounts/${id}/`, data),
  updateBalance: (id: string, balance: string, asOfDate: string) =>
    api.post<BalanceSnapshot>(`/api/v1/accounts/${id}/balance/`, { balance, as_of_date: asOfDate }),
}

// Flow endpoints
export const flows = {
  list: () => api.get<RecurringFlow[]>('/api/v1/flows/'),
  create: (data: Partial<RecurringFlow>) => api.post<RecurringFlow>('/api/v1/flows/', data),
  update: (id: string, data: Partial<RecurringFlow>) =>
    api.patch<RecurringFlow>(`/api/v1/flows/${id}/`, data),
}

// Metrics endpoints
export const metrics = {
  current: () => api.get<MetricSnapshot>('/api/v1/metrics/current/'),
  history: (days?: number) => api.get<{ results: MetricSnapshot[] }>(`/api/v1/metrics/history/?days=${days || 90}`),
}

// Insights endpoints
export const insights = {
  insights: () => api.get<{ results: Insight[] }>('/api/v1/insights/'),
  dismissInsight: (id: string) => api.post<Insight>(`/api/v1/insights/${id}/dismiss/`),
}

// Onboarding endpoints
export const onboarding = {
  getProgress: () => api.get<OnboardingStepResponse>('/api/v1/onboarding/current/'),
  saveStep: (data: Record<string, unknown>) =>
    api.post<{ saved: boolean; isValid: boolean; errors: Record<string, string> }>(
      '/api/v1/onboarding/save/',
      data
    ),
  completeStep: (data: Record<string, unknown>) =>
    api.post<{ success: boolean; nextStep?: string; errors?: Record<string, string> }>(
      '/api/v1/onboarding/complete/',
      data
    ),
  skip: () => api.post<{ success: boolean; nextStep: string }>('/api/v1/onboarding/skip/'),
  back: () => api.post<{ success: boolean; currentStep: string }>('/api/v1/onboarding/back/'),
}

// Scenario endpoints
export const scenarios = {
  list: () =>
    api.get<Scenario[] | { results: Scenario[] }>('/api/v1/scenarios/')
      .then(normalizeListResponse),
  get: (id: string) => api.get<Scenario>(`/api/v1/scenarios/${id}/`),
  create: (data: Partial<Scenario>) => api.post<Scenario>('/api/v1/scenarios/', data),
  update: (id: string, data: Partial<Scenario>) => api.patch<Scenario>(`/api/v1/scenarios/${id}/`, data),
  delete: (id: string) => api.delete<void>(`/api/v1/scenarios/${id}/`),
  compute: (id: string) => api.post<{ status: string; projection_count: number }>(`/api/v1/scenarios/${id}/compute/`),
  getProjections: (id: string) => api.get<ScenarioProjection[]>(`/api/v1/scenarios/${id}/projections/`),
  listChanges: (scenarioId: string) =>
    api.get<ScenarioChange[] | { results: ScenarioChange[] }>(`/api/v1/scenario-changes/?scenario=${scenarioId}`)
      .then(normalizeListResponse),
  addChange: (data: Partial<ScenarioChange>) =>
    api.post<ScenarioChange>('/api/v1/scenario-changes/', data),
  updateChange: (changeId: string, data: Partial<ScenarioChange>) =>
    api.patch<ScenarioChange>(`/api/v1/scenario-changes/${changeId}/`, data),
  deleteChange: (changeId: string) => api.delete<void>(`/api/v1/scenario-changes/${changeId}/`),
  compare: (scenarioIds: string[]) =>
    api.post<{ results: Array<{ scenario: Scenario; projections: ScenarioProjection[] }> }>(
      '/api/v1/scenarios/compare/',
      { scenario_ids: scenarioIds }
    ),
}
