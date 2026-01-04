# Task 7: Next.js 15 Frontend Setup

## Objective
Initialize Next.js 15 frontend with App Router, TypeScript, Tailwind CSS 4, shadcn/ui, and Tremor for dashboard components.

## Prerequisites
- None (can run parallel to backend tasks)

## Deliverables
1. Next.js 15 project with App Router
2. TypeScript 5.x configuration
3. Tailwind CSS 4 setup
4. shadcn/ui components installed
5. Tremor chart library configured
6. API client setup
7. Authentication flow
8. Basic layout structure

---

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── accounts/page.tsx
│   │   ├── flows/page.tsx
│   │   ├── scenarios/page.tsx
│   │   └── settings/page.tsx
│   └── onboarding/
│       └── page.tsx
├── components/
│   ├── ui/              # shadcn components
│   ├── dashboard/
│   ├── accounts/
│   ├── flows/
│   └── onboarding/
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   ├── utils.ts
│   └── types.ts
├── hooks/
│   ├── use-auth.ts
│   ├── use-household.ts
│   └── use-api.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── Dockerfile.dev
```

---

## package.json

```json
{
  "name": "effluent-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@tanstack/react-query": "^5.0.0",
    "@tremor/react": "^3.0.0",
    "decimal.js": "^10.4.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "class-variance-authority": "^0.7.0",
    "lucide-react": "^0.300.0",
    "date-fns": "^3.0.0",
    "zod": "^3.22.0",
    "react-hook-form": "^7.50.0",
    "@hookform/resolvers": "^3.3.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "postcss": "^8.4.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^15.0.0"
  }
}
```

---

## next.config.ts

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
```

---

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        tremor: {
          brand: {
            faint: '#eff6ff',
            muted: '#bfdbfe',
            subtle: '#60a5fa',
            DEFAULT: '#3b82f6',
            emphasis: '#1d4ed8',
            inverted: '#ffffff',
          },
        },
      },
    },
  },
  plugins: [],
}

export default config
```

---

## app/globals.css

```css
@import 'tailwindcss';

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

---

## lib/types.ts

```typescript
import Decimal from 'decimal.js'

export interface User {
  id: string
  email: string
  username: string
}

export interface Household {
  id: string
  name: string
  slug: string
  currency: string
  taxFilingStatus: string
  stateOfResidence: string
  onboardingCompleted: boolean
}

export interface HouseholdMember {
  id: string
  name: string
  relationship: string
  dateOfBirth?: string
  isPrimary: boolean
  employmentStatus: string
}

export interface Account {
  id: string
  name: string
  accountType: string
  institution: string
  isActive: boolean
  currentBalance: string
  currentMarketValue?: string
  currentCostBasis?: string
}

export interface BalanceSnapshot {
  id: string
  accountId: string
  asOfDate: string
  balance: string
  costBasis?: string
  marketValue?: string
}

export interface RecurringFlow {
  id: string
  name: string
  flowType: 'income' | 'expense'
  incomeCategory?: string
  expenseCategory?: string
  amount: string
  frequency: string
  startDate: string
  endDate?: string
  isActive: boolean
  monthlyAmount: string
}

export interface MetricSnapshot {
  id: string
  asOfDate: string
  netWorthMarket: string
  netWorthCost: string
  monthlySurplus: string
  dscr: string
  liquidityMonths: string
  savingsRate: string
  dtiRatio: string
  debtToAssetMarket: string
  highInterestDebtRatio: string
  housingRatio: string
}

export interface Insight {
  id: string
  severity: 'critical' | 'warning' | 'info' | 'positive'
  category: string
  title: string
  description: string
  recommendation?: string
  isDismissed: boolean
}

export interface OnboardingProgress {
  currentStep: string
  completedSteps: string[]
  skippedSteps: string[]
  progressPercentage: number
  isComplete: boolean
}

export interface OnboardingStepResponse {
  step: string
  stepLabel: string
  progressPercentage: number
  canSkip: boolean
  canGoBack: boolean
  draftData: Record<string, unknown>
  isValid: boolean
  validationErrors: Record<string, string>
}
```

---

## lib/api.ts

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

interface RequestOptions extends RequestInit {
  data?: unknown
}

class ApiError extends Error {
  constructor(public status: number, message: string, public errors?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { data, ...fetchOptions } = options

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
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
  list: () => api.get<Account[]>('/api/v1/accounts/'),
  get: (id: string) => api.get<Account>(`/api/v1/accounts/${id}/`),
  create: (data: Partial<Account>) => api.post<Account>('/api/v1/accounts/', data),
  update: (id: string, data: Partial<Account>) => api.patch<Account>(`/api/v1/accounts/${id}/`, data),
  updateBalance: (id: string, data: { balance: string; asOfDate: string }) =>
    api.post<BalanceSnapshot>(`/api/v1/accounts/${id}/balance/`, data),
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
  history: (days?: number) => api.get<MetricSnapshot[]>(`/api/v1/metrics/history/?days=${days || 90}`),
  insights: () => api.get<Insight[]>('/api/v1/metrics/insights/'),
}

// Onboarding endpoints
export const onboarding = {
  getProgress: () => api.get<OnboardingStepResponse>('/api/v1/onboarding/'),
  saveStep: (data: Record<string, unknown>) =>
    api.post<{ saved: boolean; isValid: boolean; errors: Record<string, string> }>(
      '/api/v1/onboarding/save/',
      { data }
    ),
  completeStep: (data: Record<string, unknown>) =>
    api.post<{ success: boolean; nextStep?: string; errors?: Record<string, string> }>(
      '/api/v1/onboarding/complete/',
      { data }
    ),
  skip: () => api.post<{ success: boolean; nextStep: string }>('/api/v1/onboarding/skip/'),
  back: () => api.post<{ success: boolean; currentStep: string }>('/api/v1/onboarding/back/'),
}

import type { Household, Account, RecurringFlow, MetricSnapshot, Insight } from './types'
```

---

## lib/utils.ts

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import Decimal from 'decimal.js'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: string | number | Decimal, currency = 'USD'): string {
  const num = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : value.toNumber()
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(num)
}

export function formatPercent(value: string | number | Decimal, decimals = 1): string {
  const num = typeof value === 'string' ? parseFloat(value) : typeof value === 'number' ? value : value.toNumber()
  return `${(num * 100).toFixed(decimals)}%`
}

export function formatNumber(value: string | number, decimals = 0): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

export function getMetricStatus(
  value: number,
  warningThreshold: number,
  criticalThreshold: number,
  comparison: 'lt' | 'gt'
): 'good' | 'warning' | 'critical' {
  if (comparison === 'lt') {
    if (value < criticalThreshold) return 'critical'
    if (value < warningThreshold) return 'warning'
    return 'good'
  } else {
    if (value > criticalThreshold) return 'critical'
    if (value > warningThreshold) return 'warning'
    return 'good'
  }
}

export const metricStatusColors = {
  good: 'text-green-600 bg-green-50',
  warning: 'text-amber-600 bg-amber-50',
  critical: 'text-red-600 bg-red-50',
}
```

---

## app/layout.tsx

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Effluent.io - Personal Finance Modeling',
  description: 'Model and forecast your personal finances like a business',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

---

## components/providers.tsx

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

---

## Dockerfile.dev

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

---

## Initialize shadcn/ui

After creating the project, run:

```bash
npx shadcn@latest init
```

Select:
- Style: Default
- Base color: Slate
- CSS variables: Yes

Then add components:

```bash
npx shadcn@latest add button card input label form dialog dropdown-menu table tabs toast
```

---

## Verification Steps

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start dev server:
   ```bash
   npm run dev
   ```

3. Verify:
   - Page loads at http://localhost:3000
   - No TypeScript errors
   - Tailwind styles working
   - React Query provider working

4. Test API client:
   ```typescript
   // In browser console or test file
   import { api } from '@/lib/api'
   // Should be properly configured
   ```

## Acceptance Criteria
- [ ] Next.js 15 with App Router running
- [ ] TypeScript 5.x configured
- [ ] Tailwind CSS 4 working
- [ ] shadcn/ui components installed
- [ ] Tremor available for charts
- [ ] API client configured
- [ ] React Query provider set up
- [ ] Basic layout structure in place
- [ ] Docker dev environment working
