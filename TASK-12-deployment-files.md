# TASK-12: Deployment Files Setup

## Objective
Add production Dockerfiles and configuration files required for Portainer deployment from GitHub.

## Prerequisites
- Repository cloned locally
- Task 01 (backend setup) complete
- Task 07 (frontend setup) complete

## Deliverables

### 1. Backend Production Dockerfile

**File: `backend/docker/Dockerfile.prod`**

```dockerfile
FROM python:3.13-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements/base.txt requirements/prod.txt ./requirements/
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements/prod.txt

FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq5 \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir /wheels/* && rm -rf /wheels

COPY . .

RUN python manage.py collectstatic --noinput

RUN useradd -m -u 1000 django && chown -R django:django /app
USER django

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2", "--threads", "4", "--access-logfile", "-", "--error-logfile", "-"]
```

---

### 2. Backend Production Requirements

**File: `backend/requirements/prod.txt`**

```
-r base.txt
gunicorn>=22.0
```

---

### 3. Frontend Production Dockerfile

**File: `frontend/Dockerfile.prod`**

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

---

### 4. Next.js Config (Update)

**File: `frontend/next.config.js`** (or `next.config.ts`)

Ensure `output: 'standalone'` is set:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
}

module.exports = nextConfig
```

If using TypeScript config (`next.config.ts`):

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
}

export default nextConfig
```

---

### 5. Docker Compose for Portainer

**File: `deploy/docker-compose.portainer.yml`**

```yaml
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: effluent
      POSTGRES_USER: effluent
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - effluent_postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U effluent"]
      interval: 5s
      timeout: 5s
      retries: 10
    networks:
      - effluent-internal

  migrate:
    build:
      context: https://github.com/Oliver16/effluent.git#main:backend
      dockerfile: docker/Dockerfile.prod
    command: >
      sh -c "
        echo 'Waiting for database...' &&
        while ! nc -z db 5432; do sleep 1; done &&
        echo 'Running migrations...' &&
        python manage.py migrate --noinput &&
        echo 'Migrations complete!'
      "
    environment:
      - DEBUG=0
      - SECRET_KEY=${SECRET_KEY}
      - DB_HOST=db
      - DB_NAME=effluent
      - DB_USER=effluent
      - DB_PASSWORD=${DB_PASSWORD}
      - DJANGO_SETTINGS_MODULE=config.settings.prod
    depends_on:
      db:
        condition: service_healthy
    networks:
      - effluent-internal
    deploy:
      restart_policy:
        condition: on-failure
        max_attempts: 3

  backend:
    build:
      context: https://github.com/Oliver16/effluent.git#main:backend
      dockerfile: docker/Dockerfile.prod
    restart: unless-stopped
    environment:
      - DEBUG=0
      - SECRET_KEY=${SECRET_KEY}
      - DB_HOST=db
      - DB_NAME=effluent
      - DB_USER=effluent
      - DB_PASSWORD=${DB_PASSWORD}
      - ALLOWED_HOSTS=${BACKEND_HOST},localhost
      - CORS_ORIGINS=https://${FRONTEND_HOST}
      - DJANGO_SETTINGS_MODULE=config.settings.prod
    depends_on:
      db:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.effluent-api.rule=Host(`${BACKEND_HOST}`)"
      - "traefik.http.routers.effluent-api.entrypoints=websecure"
      - "traefik.http.routers.effluent-api.tls=true"
      - "traefik.http.routers.effluent-api.tls.certresolver=letsencrypt"
      - "traefik.http.services.effluent-api.loadbalancer.server.port=8000"
      - "traefik.docker.network=traefik-public"
    networks:
      - effluent-internal
      - traefik-public

  frontend:
    build:
      context: https://github.com/Oliver16/effluent.git#main:frontend
      dockerfile: Dockerfile.prod
      args:
        - NEXT_PUBLIC_API_URL=https://${BACKEND_HOST}
    restart: unless-stopped
    environment:
      - NEXT_PUBLIC_API_URL=https://${BACKEND_HOST}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.effluent-web.rule=Host(`${FRONTEND_HOST}`)"
      - "traefik.http.routers.effluent-web.entrypoints=websecure"
      - "traefik.http.routers.effluent-web.tls=true"
      - "traefik.http.routers.effluent-web.tls.certresolver=letsencrypt"
      - "traefik.http.services.effluent-web.loadbalancer.server.port=3000"
      - "traefik.docker.network=traefik-public"
    networks:
      - traefik-public

volumes:
  effluent_postgres:

networks:
  effluent-internal:
    driver: bridge
  traefik-public:
    external: true
```

---

## File Structure After Completion

```
effluent/
├── backend/
│   ├── docker/
│   │   ├── Dockerfile.dev      # (from Task 01)
│   │   └── Dockerfile.prod     # ← NEW
│   └── requirements/
│       ├── base.txt            # (from Task 01)
│       └── prod.txt            # ← NEW
├── frontend/
│   ├── Dockerfile.dev          # (from Task 07)
│   ├── Dockerfile.prod         # ← NEW
│   └── next.config.js          # ← UPDATE (add output: 'standalone')
└── deploy/
    └── docker-compose.portainer.yml  # ← NEW
```

---

## Verification

```bash
# Verify files exist
ls -la backend/docker/Dockerfile.prod
ls -la backend/requirements/prod.txt
ls -la frontend/Dockerfile.prod
cat frontend/next.config.js | grep standalone

# Verify docker-compose syntax
docker compose -f deploy/docker-compose.portainer.yml config
```

---

## Acceptance Criteria

- [ ] `backend/docker/Dockerfile.prod` exists with multi-stage build
- [ ] `backend/requirements/prod.txt` includes gunicorn
- [ ] `frontend/Dockerfile.prod` exists with standalone output
- [ ] `frontend/next.config.js` has `output: 'standalone'`
- [ ] `deploy/docker-compose.portainer.yml` exists with all services
- [ ] Docker compose validates without errors
- [ ] All files committed and pushed to GitHub
