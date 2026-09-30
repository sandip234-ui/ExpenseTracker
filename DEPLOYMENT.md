# FinTrack Production Deployment Guide

This guide details the production architecture, hosting configurations, environment variables, database migrations, and operational safeguards for deploying FinTrack.

---

## 1. Hosting Architecture Overview

FinTrack operates as a decoupled, modern full-stack web application:

| Component | Recommended Providers | Runtime | Build / Start Command |
| :--- | :--- | :--- | :--- |
| **Frontend** | Vercel, Cloudflare Pages, Netlify, AWS S3+CloudFront | Static SPA (HTML/JS/CSS) | Build: `npm run build`<br>Output: `dist/` |
| **Backend API** | Render, Railway, Fly.io, AWS ECS / App Runner, VPS | Node.js (v20+ ESM) | Build: `npm ci --omit=dev && npx prisma generate`<br>Start: `npm start` |
| **Database** | Managed PostgreSQL (Neon, Supabase, AWS RDS, Render Postgres) | PostgreSQL 15+ | Migrations: `npx prisma migrate deploy` |

---

## 2. Environment Variables

### Backend (`server/`)

| Variable | Required | Description | Example / Recommended Value |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | Execution mode. Must be `production`. Startup halts if insecure secrets are detected. | `production` |
| `PORT` | No | Internal port for Express to listen on (default 5001). Hosting platforms often inject this automatically. | `5001` or `$PORT` |
| `DATABASE_URL` | **Yes** | PostgreSQL connection string with SSL enabled. | `postgresql://user:pass@host:5432/fintrack?schema=public&sslmode=require` |
| `JWT_SECRET` | **Yes** | Cryptographic secret for signing tokens. **Must be >= 32 characters of high-entropy randomness**. | Generate via: `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | No | Token session expiration duration. Defaults to 7 days. | `7d` |
| `CLIENT_ORIGIN` | **Yes** | Allowed CORS origins. Comma-separated list of approved frontend domain names. | `https://fintrack.example.com` |

### Frontend (`frontend/`)

| Variable | Required | Description | Example / Recommended Value |
| :--- | :---: | :--- | :--- |
| `VITE_DATA_SOURCE` | No | Authoritative mode. Defaults to `api`. | `api` |
| `VITE_API_BASE_URL` | No | Full URL to API endpoint. If using a reverse proxy or same domain, leave unset to default to `/api`. | `https://api.fintrack.example.com/api` |

---

## 3. Deployment Pipeline & Execution Steps

### Step 1: Database Migration
Before spinning up or updating the API containers, apply pending migrations safely:
```bash
cd server
# Deploy all committed Prisma migrations idempotently without resetting data
npx prisma migrate deploy
```
> [!IMPORTANT]
> Never run `prisma migrate dev` or `prisma migrate reset` in production environments. `prisma migrate deploy` executes only unapplied migrations and never deletes or truncates data.

### Step 2: Backend API Build & Startup
```bash
cd server
npm ci --omit=dev
npx prisma generate
node src/server.js
```

### Step 3: Frontend Build & Asset Deployment
```bash
cd frontend
npm ci
npm run build
# Deploy 'dist/' folder to CDN / static web host
```

---

## 4. Health Check & Observability

- **Health Endpoint**: `GET /api/health`
  - Returns `200 OK` with JSON:
    ```json
    { "status": "ok", "service": "FinTrack API", "timestamp": "2026-09-30T18:00:00.000Z" }
    ```
  - Configurable as the container liveness probe, Kubernetes health check, or cloud load balancer check.
- **Graceful Shutdown**:
  - The API intercepts `SIGTERM` and `SIGINT`.
  - Halts acceptance of new HTTP connections.
  - Flushes ongoing requests.
  - Gracefully closes the Prisma database connection pool before exiting with code 0.

---

## 5. Security Controls Implemented

1. **HttpOnly + Secure + SameSite Cookies**: Browser sessions are authenticated with HttpOnly cookies (`fintrack_token`), protecting against cross-site scripting (XSS) credential theft.
2. **Bearer Token Support**: Automated testing and API integrations remain supported via `Authorization: Bearer <token>`.
3. **Helmet Security Headers**: Enforces `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` (anti-clickjacking), and disables DNS prefetching.
4. **Strict CORS**: Cross-origin requests from unapproved domains are rejected with `HTTP 403 CORS_FORBIDDEN`.
5. **Rate Limiting**: Public authentication routes (`/api/auth/login`, `/api/auth/register`) are throttled to 20 attempts per 15 minutes to block automated brute-force attacks.
6. **Request Size Capping**: JSON payloads are capped at 1MB to prevent memory exhaustion attacks.
7. **Production Error Masking**: `500 Internal Server Error` responses are sanitized to generic messages; raw SQL queries, database constraints, and stack traces are never disclosed.
8. **Multi-Tenant Authorization**: All financial records enforce database-level tenant isolation by `userId`. Cross-user access returns `404 Not Found`.

---

## 6. Rollback Considerations

1. **Application Code Rollback**:
   - Both frontend and backend are stateless. Rolling back to a previous container tag or git commit is immediate.
2. **Database Migrations**:
   - All migrations applied are non-destructive (additive columns, foreign keys, and indexes).
   - If an API version must be rolled back, the existing schema remains backwards-compatible.
3. **Emergency Recovery Tooling**:
   - The backup and migration recovery script in `scripts/migration/backup.js` and `migrator.js` remains intact.
