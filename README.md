# Effluent.io Task Breakdown

## Overview
Self-contained task specifications for building Effluent.io. Each task can be assigned to a separate AI agent.

## Task Summary

| # | Task | Est. Time | Dependencies | Can Parallel |
|---|------|-----------|--------------|--------------|
| 01 | Backend Setup | 30 min | None | ✅ Start |
| 02 | Account Models | 45 min | 01 | After 01 |
| 03 | Recurring Flows | 30 min | 01 | After 01 |
| 04 | Tax Calculations | 60 min | 01 | After 01 |
| 05 | Metrics & Insights | 45 min | 02, 03 | After 02+03 |
| 06 | Onboarding Wizard | 45 min | 01-04 | After 04 |
| 07 | Frontend Setup | 30 min | None | ✅ Parallel |
| 08 | Dashboard UI | 45 min | 07, 05 | After 07 |
| 09 | API Endpoints | 45 min | 01-05 | After 05 |
| 10 | Scenario Engine | 60 min | 02, 03, 05 | After 05 |
| 11 | Scenario UI | 45 min | 07, 10 | After 10 |

## Dependency Graph

```
Wave 1 (Parallel Start):
  01-Backend ──┬──► 02-Accounts ──┐
               ├──► 03-Flows ─────┼──► 05-Metrics ──┬──► 09-API
               └──► 04-Taxes ─────┘                 └──► 10-Scenarios ──► 11-UI
  
  07-Frontend ──────────────────────► 08-Dashboard ──────────────────────────►
```

## Optimal Agent Assignment

### 2 Agents (Sequential)
- Agent 1: Tasks 01, 02, 03, 04, 05, 06, 09, 10
- Agent 2: Tasks 07, 08, 11

### 3 Agents (Moderate Parallel)
- Agent 1: 01 → 02 → 05 → 10
- Agent 2: 03 → 04 → 06 → 09
- Agent 3: 07 → 08 → 11

### 5+ Agents (Maximum Parallel)
Wave 1: Agents on 01 + 07
Wave 2: Agents on 02, 03, 04 (after 01)
Wave 3: Agents on 05, 08 (after 02+03+07)
Wave 4: Agents on 06, 09, 10 (after 05)
Wave 5: Agent on 11 (after 10)

## Task File Format

Each task contains:
1. **Objective** - What to build
2. **Prerequisites** - Required completed tasks
3. **Deliverables** - Concrete outputs
4. **Code** - Copy-paste ready code blocks
5. **Verification** - How to test completion
6. **Acceptance Criteria** - Checklist

## How to Execute a Task

```bash
# 1. Read the entire task file
cat tasks/TASK-XX-name.md

# 2. Create the directory structure shown
# 3. Copy code blocks into files
# 4. Run verification commands
# 5. Check acceptance criteria
```

## Key Technologies

### Backend
- Python 3.13+
- Django 6.0+
- PostgreSQL 16+
- Django REST Framework
- JWT Auth (SimpleJWT)

### Frontend  
- Next.js 15 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui
- Tremor (charts)
- TanStack Query

## Code Conventions

### Models
- UUIDs for PKs
- `HouseholdOwnedModel` for multi-tenant
- Decimal for money
- DateField for dates

### API
- `/api/v1/` prefix
- JWT in Authorization header
- `X-Household-ID` header
- Standard DRF responses

### Frontend
- `use client` for client components
- React Query for server state
- Zod for validation
- shadcn patterns

## File Sizes

```
TASK-01-backend-setup.md      14.8 KB
TASK-02-account-models.md     17.1 KB  
TASK-03-recurring-flows.md    14.8 KB
TASK-04-tax-calculations.md   23.5 KB  ← Most complex backend
TASK-05-metrics-insights.md    5.6 KB
TASK-06-onboarding-wizard.md  14.0 KB
TASK-07-frontend-setup.md     15.8 KB
TASK-08-dashboard-ui.md       12.7 KB
TASK-09-api-endpoints.md      16.3 KB
TASK-10-scenario-engine.md    20.4 KB  ← Most complex feature
TASK-11-scenario-ui.md        18.3 KB
```

## Quick Start for Agents

### Backend Agent
```bash
# Start with Task 01
docker-compose up -d
# Follow task file exactly
# Verify with: docker-compose exec backend python manage.py check
```

### Frontend Agent
```bash
# Start with Task 07
npx create-next-app@latest frontend --typescript --tailwind --app
# Follow task file exactly
# Verify with: npm run build
```

## Integration Points

Backend → Frontend communication:
- Auth: POST /api/auth/token/
- Data: GET/POST /api/v1/{resource}/
- Headers: Authorization + X-Household-ID

## Testing End-to-End

After all tasks:
1. Backend: `docker-compose exec backend pytest`
2. Frontend: `npm test`
3. E2E: Create user → Onboard → Dashboard → Scenario
