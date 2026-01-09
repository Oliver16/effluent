import type {
  Household,
  HouseholdMember,
  UserProfile,
  UserSettings,
  UserSession,
  Account,
  RecurringFlow,
  MetricSnapshot,
  Insight,
  BalanceSnapshot,
  OnboardingStepResponse,
  Scenario,
  ScenarioChange,
  ScenarioProjection,
  IncomeSourceDetail,
  PreTaxDeduction,
  PostTaxDeduction,
  SelfEmploymentTax,
  LifeEventTemplate,
  LifeEventCategoryGroup,
  BaselineResponse,
  BaselineActionResponse,
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

// Token refresh state to prevent concurrent refresh attempts
let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

/**
 * Attempt to refresh the access token using the refresh token.
 * Returns the new access token or null if refresh failed.
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null
  if (!refreshToken) {
    return null
  }

  try {
    const response = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    if (data.access) {
      localStorage.setItem('token', data.access)
      // Also update refresh token if a new one is provided (when ROTATE_REFRESH_TOKENS is enabled)
      if (data.refresh) {
        localStorage.setItem('refreshToken', data.refresh)
      }
      return data.access
    }
    return null
  } catch {
    return null
  }
}

/**
 * Get a refreshed token, handling concurrent refresh attempts.
 * Multiple calls will share the same refresh promise.
 */
async function getRefreshedToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = refreshAccessToken().finally(() => {
    isRefreshing = false
    refreshPromise = null
  })

  return refreshPromise
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

/**
 * Convert a snake_case string to camelCase.
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Convert a camelCase string to snake_case.
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

/**
 * Recursively transform all camelCase keys in an object to snake_case.
 * Handles nested objects and arrays.
 */
export function toSnakeCase<T>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item)) as T
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const snakeKey = camelToSnake(key)
      result[snakeKey] = toSnakeCase(value)
    }
    return result as T
  }

  return obj as T
}

/**
 * Recursively transform all snake_case keys in an object to camelCase.
 * Handles nested objects and arrays.
 */
export function toCamelCase<T>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item)) as T
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const camelKey = snakeToCamel(key)
      result[camelKey] = toCamelCase(value)
    }
    return result as T
  }

  return obj as T
}

async function request<T>(endpoint: string, options: RequestOptions = {}, isRetry = false): Promise<T> {
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
    // If we get a 401 and haven't retried yet, try to refresh the token
    if (response.status === 401 && !isRetry && typeof window !== 'undefined') {
      const newToken = await getRefreshedToken()
      if (newToken) {
        // Retry the request with the new token
        return request<T>(endpoint, options, true)
      }
    }

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
  list: () => api.get<Household[]>('/api/v1/households/').then(data => toCamelCase<Household[]>(data)),
  get: (id: string) => api.get<Household>(`/api/v1/households/${id}/`).then(data => toCamelCase<Household>(data)),
  create: (data: Partial<Household>) => api.post<Household>('/api/v1/households/', data).then(data => toCamelCase<Household>(data)),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch<Household>(`/api/v1/households/${id}/`, data).then(data => toCamelCase<Household>(data)),
}

export const profile = {
  get: () => api.get<UserProfile>('/api/v1/profile/').then(data => toCamelCase<UserProfile>(data)),
  update: (data: Partial<UserProfile>) =>
    api.patch<UserProfile>('/api/v1/profile/', {
      username: data.username,
      date_of_birth: data.dateOfBirth,
    }).then(data => toCamelCase<UserProfile>(data)),
  delete: () => api.delete<void>('/api/v1/profile/'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/api/v1/profile/change-password/', {
      current_password: currentPassword,
      new_password: newPassword,
    }),
}

export const settings = {
  getNotifications: () =>
    api.get<UserSettings>('/api/v1/settings/notifications/').then(data => toCamelCase<UserSettings>(data)),
  updateNotifications: (data: Partial<UserSettings>) =>
    api.patch<UserSettings>('/api/v1/settings/notifications/', {
      weekly_summary: data.weeklySummary,
      insight_alerts: data.insightAlerts,
      balance_reminders: data.balanceReminders,
      critical_alerts: data.criticalAlerts,
      two_factor_enabled: data.twoFactorEnabled,
    }).then(data => toCamelCase<UserSettings>(data)),
  updateTwoFactor: (enabled: boolean) =>
    api.post<UserSettings>('/api/v1/settings/two-factor/', { enabled }).then(data => toCamelCase<UserSettings>(data)),
  sessions: () => api.get<UserSession[]>('/api/v1/settings/sessions/').then(data => toCamelCase<UserSession[]>(data)),
  exportData: () => api.get<Record<string, unknown>>('/api/v1/settings/export/'),
}

// Household member endpoints
export const members = {
  list: () =>
    api.get<HouseholdMember[] | { results: HouseholdMember[] }>('/api/v1/members/')
      .then(normalizeListResponse),
}

// Account endpoints
export const accounts = {
  list: () => api.get<Account[] | { results: Account[] }>('/api/v1/accounts/').then(data => {
    // Handle both flat array and paginated responses
    const items = Array.isArray(data) ? data : (data.results || [])
    return { results: toCamelCase<Account[]>(items) }
  }),
  get: (id: string) => api.get<Account>(`/api/v1/accounts/${id}/`).then(data => toCamelCase<Account>(data)),
  create: (data: Partial<Account>) => {
    // Convert camelCase to snake_case and map currentBalance to initial_balance
    const payload: Record<string, unknown> = {
      name: data.name,
      account_type: data.accountType,
      institution: data.institution,
      is_active: data.isActive,
    }
    // Backend expects initial_balance for creating the first snapshot
    if (data.currentBalance) {
      payload.initial_balance = data.currentBalance
    }
    return api.post<Account>('/api/v1/accounts/', payload).then(data => toCamelCase<Account>(data))
  },
  update: (id: string, data: Partial<Account>) => {
    const payload = toSnakeCase(data)
    return api.patch<Account>(`/api/v1/accounts/${id}/`, payload).then(data => toCamelCase<Account>(data))
  },
  updateBalance: (id: string, balance: string, asOfDate: string) =>
    api.post<BalanceSnapshot>(`/api/v1/accounts/${id}/balance/`, { balance, as_of_date: asOfDate }).then(data => toCamelCase<BalanceSnapshot>(data)),
  getHistory: (id: string) =>
    api.get<BalanceSnapshot[]>(`/api/v1/accounts/${id}/history/`).then(data => toCamelCase<BalanceSnapshot[]>(data)),
}

// Flow endpoints
export const flows = {
  list: () => api.get<RecurringFlow[] | { results: RecurringFlow[] }>('/api/v1/flows/').then(data => {
    // Handle both flat array and paginated responses
    const items = Array.isArray(data) ? data : (data.results || [])
    return toCamelCase<RecurringFlow[]>(items)
  }),
  create: (data: Partial<RecurringFlow>) => {
    // Convert camelCase to snake_case for backend
    const payload = toSnakeCase(data)
    return api.post<RecurringFlow>('/api/v1/flows/', payload).then(data => toCamelCase<RecurringFlow>(data))
  },
  update: (id: string, data: Partial<RecurringFlow>) => {
    const payload = toSnakeCase(data)
    return api.patch<RecurringFlow>(`/api/v1/flows/${id}/`, payload).then(data => toCamelCase<RecurringFlow>(data))
  },
}

// Metrics endpoints
export const metrics = {
  current: () => api.get<MetricSnapshot>('/api/v1/metrics/current/').then(data => toCamelCase<MetricSnapshot>(data)),
  history: (days?: number) => api.get<{ results: MetricSnapshot[] }>(`/api/v1/metrics/history/?days=${days || 90}`)
    .then(data => ({ results: toCamelCase<MetricSnapshot[]>(data.results || []) })),
}

// Insights endpoints
export const insights = {
  insights: () => api.get<{ results: Insight[] }>('/api/v1/insights/')
    .then(data => ({ results: toCamelCase<Insight[]>(data.results || []) })),
  dismissInsight: (id: string) => api.post<Insight>(`/api/v1/insights/${id}/dismiss/`).then(data => toCamelCase<Insight>(data)),
}

// Onboarding endpoints
export const onboarding = {
  getProgress: () => api.get<OnboardingStepResponse>('/api/v1/onboarding/current/')
    .then(data => {
      // Preserve draftData as-is (frontend uses snake_case keys for form fields)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawData = data as any
      const draftData = rawData.draftData || rawData.draft_data || {}
      const converted = toCamelCase<OnboardingStepResponse>(data)
      return { ...converted, draftData }
    }),
  saveStep: (data: Record<string, unknown>) =>
    api.post<{ saved: boolean; isValid: boolean; errors: Record<string, string> }>(
      '/api/v1/onboarding/save/',
      data
    ).then(data => toCamelCase<{ saved: boolean; isValid: boolean; errors: Record<string, string> }>(data)),
  completeStep: (data: Record<string, unknown>) =>
    api.post<{ success: boolean; nextStep?: string; errors?: Record<string, string> }>(
      '/api/v1/onboarding/complete/',
      data
    ).then(data => toCamelCase<{ success: boolean; nextStep?: string; errors?: Record<string, string> }>(data)),
  skip: () => api.post<{ success: boolean; nextStep: string }>('/api/v1/onboarding/skip/')
    .then(data => toCamelCase<{ success: boolean; nextStep: string }>(data)),
  back: () => api.post<{ success: boolean; currentStep: string }>('/api/v1/onboarding/back/')
    .then(data => toCamelCase<{ success: boolean; currentStep: string }>(data)),
}

// Income source endpoints
export const incomeSources = {
  list: () =>
    api.get<IncomeSourceDetail[] | { results: IncomeSourceDetail[] }>('/api/v1/income-sources/')
      .then(normalizeListResponse)
      .then(data => toCamelCase<IncomeSourceDetail[]>(data)),
  get: (id: string) =>
    api.get<IncomeSourceDetail>(`/api/v1/income-sources/${id}/`)
      .then(data => toCamelCase<IncomeSourceDetail>(data)),
  paycheck: (id: string) =>
    api.get<Record<string, string>>(`/api/v1/income-sources/${id}/paycheck/`)
      .then(data => toCamelCase<Record<string, string>>(data)),
}

// Pre-tax deduction endpoints
export const pretaxDeductions = {
  list: () =>
    api.get<PreTaxDeduction[] | { results: PreTaxDeduction[] }>('/api/v1/pretax-deductions/')
      .then(normalizeListResponse)
      .then(data => toCamelCase<PreTaxDeduction[]>(data)),
  get: (id: string) =>
    api.get<PreTaxDeduction>(`/api/v1/pretax-deductions/${id}/`)
      .then(data => toCamelCase<PreTaxDeduction>(data)),
  create: (data: Partial<PreTaxDeduction>) =>
    api.post<PreTaxDeduction>('/api/v1/pretax-deductions/', toSnakeCase(data))
      .then(data => toCamelCase<PreTaxDeduction>(data)),
  update: (id: string, data: Partial<PreTaxDeduction>) =>
    api.patch<PreTaxDeduction>(`/api/v1/pretax-deductions/${id}/`, toSnakeCase(data))
      .then(data => toCamelCase<PreTaxDeduction>(data)),
  delete: (id: string) => api.delete<void>(`/api/v1/pretax-deductions/${id}/`),
}

// Post-tax deduction endpoints
export const posttaxDeductions = {
  list: () =>
    api.get<PostTaxDeduction[] | { results: PostTaxDeduction[] }>('/api/v1/posttax-deductions/')
      .then(normalizeListResponse)
      .then(data => toCamelCase<PostTaxDeduction[]>(data)),
  get: (id: string) =>
    api.get<PostTaxDeduction>(`/api/v1/posttax-deductions/${id}/`)
      .then(data => toCamelCase<PostTaxDeduction>(data)),
  create: (data: Partial<PostTaxDeduction>) =>
    api.post<PostTaxDeduction>('/api/v1/posttax-deductions/', toSnakeCase(data))
      .then(data => toCamelCase<PostTaxDeduction>(data)),
  update: (id: string, data: Partial<PostTaxDeduction>) =>
    api.patch<PostTaxDeduction>(`/api/v1/posttax-deductions/${id}/`, toSnakeCase(data))
      .then(data => toCamelCase<PostTaxDeduction>(data)),
  delete: (id: string) => api.delete<void>(`/api/v1/posttax-deductions/${id}/`),
}

// Self-employment tax endpoints
export const selfEmploymentTax = {
  list: () =>
    api.get<SelfEmploymentTax[] | { results: SelfEmploymentTax[] }>('/api/v1/self-employment-tax/')
      .then(normalizeListResponse)
      .then(data => toCamelCase<SelfEmploymentTax[]>(data)),
  get: (id: string) =>
    api.get<SelfEmploymentTax>(`/api/v1/self-employment-tax/${id}/`)
      .then(data => toCamelCase<SelfEmploymentTax>(data)),
  create: (data: Partial<SelfEmploymentTax>) =>
    api.post<SelfEmploymentTax>('/api/v1/self-employment-tax/', toSnakeCase(data))
      .then(data => toCamelCase<SelfEmploymentTax>(data)),
  update: (id: string, data: Partial<SelfEmploymentTax>) =>
    api.patch<SelfEmploymentTax>(`/api/v1/self-employment-tax/${id}/`, toSnakeCase(data))
      .then(data => toCamelCase<SelfEmploymentTax>(data)),
  delete: (id: string) => api.delete<void>(`/api/v1/self-employment-tax/${id}/`),
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

// Life Event Template endpoints
export const lifeEventTemplates = {
  list: () =>
    api.get<{ results: LifeEventCategoryGroup[]; count: number }>('/api/v1/life-event-templates/'),
  get: (id: string) =>
    api.get<LifeEventTemplate>(`/api/v1/life-event-templates/${id}/`),
  categories: () =>
    api.get<{ categories: Array<{ value: string; label: string }> }>('/api/v1/life-event-templates/categories/'),
  apply: (templateId: string, data: {
    scenario_id: string;
    effective_date: string;
    change_values?: Record<string, Record<string, unknown>>;
  }) =>
    api.post<{
      status: string;
      template_name: string;
      changes_created: number;
      changes: ScenarioChange[];
    }>(`/api/v1/life-event-templates/${templateId}/apply/`, data),
}

// Baseline scenario endpoints
export const baseline = {
  /**
   * Get the baseline scenario with health summary.
   * Auto-creates the baseline if it doesn't exist.
   */
  get: () =>
    api.get<BaselineResponse>('/api/v1/scenarios/baseline/')
      .then(data => toCamelCase<BaselineResponse>(data)),

  /**
   * Refresh the baseline projection.
   * @param force If true, refresh even if baseline is pinned.
   */
  refresh: (force = false) =>
    api.post<BaselineActionResponse>('/api/v1/scenarios/baseline/', { action: 'refresh', force })
      .then(data => toCamelCase<BaselineActionResponse>(data)),

  /**
   * Pin the baseline to a specific as-of date.
   * Pinned baselines freeze the starting point for comparisons.
   * @param asOfDate The date to pin to (YYYY-MM-DD format)
   */
  pin: (asOfDate: string) =>
    api.post<BaselineActionResponse>('/api/v1/scenarios/baseline/', { action: 'pin', as_of_date: asOfDate })
      .then(data => toCamelCase<BaselineActionResponse>(data)),

  /**
   * Unpin the baseline, returning it to live mode.
   */
  unpin: () =>
    api.post<BaselineActionResponse>('/api/v1/scenarios/baseline/', { action: 'unpin' })
      .then(data => toCamelCase<BaselineActionResponse>(data)),
}
