# Aegis — Authorized Web Pentest Platform

A production-shaped specification and reference implementation for an authorized, OWASP WSTG-aligned web application penetration-testing SaaS.

Aegis ships as a Next.js 16 control-plane dashboard backed by Neon Postgres, with isolated worker services (planned) on Fly.io, encrypted evidence storage, and a layered safety spine: scope gating, per-request DNS pinning, RBAC, per-org KMS-wrapped data keys, emergency kill switch, and detailed audit logging.

The repository covers the full design surface — schema, security model, API contracts, queue topology, scan pipeline, and UI architecture — as well as a working demo shell that loads real data from Postgres.

## Highlights

- **Postgres schema** with composite (organization_id, …) foreign keys, row-level security on every tenant table, and INSERT-only audit grants.
- **Safety spine**: passive-by-default scanning, ownership-validated active opt-in, anti-SSRF guard, per-request scope gate, KMS-wrapped secrets, redacted logs.
- **Auth layer**: email/password + Argon2 hashing, JWT access + refresh tokens, RBAC roles (viewer → owner), in-process rate limiting, audit logging on every action.
- **Emergency stop**: a single boolean on every org that blocks new scans and rejects auth in-flight. Toggle via CLI (`npm run kill-switch`) or dashboard banner.
- **Live demo**: every page hits a real Drizzle/Neon backend; the dashboard, findings, scans, audit log, and spec pages are all wired to the canonical schema.

## Architecture at a glance

```
Browser ─▶ Vercel Edge (Next.js dashboard + control-plane API)
              │
              ├─▶ Neon Postgres  (RLS + audit + pgboss queue)
              │
              └─▶ pgboss workers on Fly.io Machines
                       ├─ Crawler (passive, DNS-pinned)
                       ├─ Passive engine (ZAP baseline + custom WSTG checks)
                       ├─ Active engine (gated, kill-switched, S3 evidence)
                       └─ Normalizer (canonical-finding fingerprint + dedup)
```

Five trust zones, three tenancy isolation layers, one source of truth. See `/spec` in the running app for the long-form design document and `/dashboard` for the live operational view.

> **Security note:** Registration is hard-locked to `ALLOWED_REGISTRATION_EMAIL`
> (defaults to `royokola3@gmail.com`). No other email can create an account.
> See `src/app/api/auth/register/route.ts:22-31` for the server-side check.

> **Goal B — Neon Auth:** The auth layer is designed to migrate to Neon Auth
> (managed Better Auth). Enable in Neon Console → Project → Branch → Auth → Enable,
> then set `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET`. Until then,
> the legacy JWT/Argon2 auth remains active. See `/build-plan` in the app for
> the full migration roadmap.

## Quick start

### Prerequisites

- Node.js 20+ (Next.js 16 requires Node 18.20+; 20 LTS recommended)
- A Neon Postgres database (free tier is enough) — [neon.tech](https://neon.tech)
- A `JWT_SECRET` (any random 32+ char string for dev)

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in your Neon connection string.

```bash
cp .env.example .env
```

The required variables are listed in [Environment variables](#environment-variables) below.

### 3. Apply the schema

```bash
npm run db:push     # drizzle-kit push against your Neon DB
npm run db:seed     # populates demo org / target / scan / finding rows
```

### 4. (Optional) Enable Row-Level Security

```bash
npm run rls:apply   # scripts/run-rls.ts + scripts/rls-migration.sql
```

This adds Postgres RLS policies to every tenant-scoped table. Demo mode runs fine without it; production deployments should always have it on.

### 5. Run the dev server

```bash
npm run dev
```

App boots at [http://localhost:3000](http://localhost:3000).

- `/` — interactive specification showcase
- `/dashboard` — live security posture view
- `/targets`, `/scans`, `/findings`, `/audit` — operational tables backed by Postgres
- `/spec`, `/spec/<slug>` — 20+ deep-dive blueprint pages
- `/auth/login`, `/auth/register` — auth API demo

## Available scripts

| Script               | What it does                                                           |
| -------------------- | ---------------------------------------------------------------------- |
| `npm run dev`        | Start Next.js dev server with HMR                                      |
| `npm run build`      | Production build                                                        |
| `npm run start`      | Run the production build                                                |
| `npm run lint`       | ESLint (flat config + `eslint-config-next`)                            |
| `npm run typecheck`  | `tsc --noEmit`                                                          |
| `npm run db:push`    | Push the Drizzle schema to the configured Neon DB                       |
| `npm run db:seed`    | Insert the demo organization, targets, scans, and findings              |
| `npm run kill-switch`| CLI for toggling the per-org `emergencyStop` flag — `on\|off\|status\|list` |
| `npm run rls:apply`  | Apply Postgres RLS policies from `scripts/rls-migration.sql`            |

## Environment variables

| Variable                    | Required | Purpose                                                       |
| --------------------------- | -------- | ------------------------------------------------------------- |
| `DATABASE_URL`              | Yes      | Neon Postgres connection string (with `?sslmode=require`)     |
| `JWT_SECRET`                | Yes      | HS256 signing key for access + refresh tokens (32+ chars)     |
| `ALLOWED_REGISTRATION_EMAIL`| No       | Only this email can register (default: `royokola3@gmail.com`) |
| `NEON_AUTH_BASE_URL`        | No       | Neon Auth URL (Goal B — enable in Neon Console)               |
| `NEON_AUTH_COOKIE_SECRET`   | No       | Cookie secret for Neon Auth (32+ chars; `openssl rand -base64 32`) |
| `NODE_ENV`                  | No       | `development` / `production`; controls cookie `secure` flag   |
| `NEXT_PUBLIC_APP_URL`       | No       | Base URL shown in client emails / auth redirects              |

> Never commit `.env`. The repo's `.gitignore` excludes it. Production secrets belong in your hosting platform's secret store (Vercel encrypted env vars, Fly secrets, etc.).

## Project layout

```
src/
├── app/                       # Next.js App Router
│   ├── api/                   # API routes (auth/login, auth/register, organizations, targets, …)
│   ├── auth/                  # Login + register pages
│   ├── dashboard/             # Live security posture view
│   ├── targets/               # Targets list + detail
│   ├── scans/                 # Scan runs list + detail
│   ├── findings/              # Normalized findings list + detail
│   ├── audit/                 # Append-only audit log viewer
│   └── spec/                  # 20+ page blueprint deep-dive
├── components/
│   ├── Shell.tsx              # Global sidebar/shell layout
│   ├── atoms.tsx              # SeverityChip, Pill, Stat, RunStatusBadge, StateBadge
│   ├── aegis/                 # Static showcase data (zones, stages, schema tables, …)
│   └── ui/                    # ToastProvider, LoadingSpinner, Skeleton, TableFilter
├── db/
│   ├── schema.ts              # Drizzle schema — 18 tables, enums, indexes
│   ├── index.ts               # Drizzle client (neon-serverless + node-postgres fallback)
│   └── seed.ts                # Demo seed script
├── domain/                    # Pure TS policy modules (scope, fingerprint, policy, types)
├── lib/
│   ├── auth.ts                # JWT, hashing, hashPassword/verifyPassword, rate limit, auditLog
│   ├── auth-middleware.ts     # withMiddleware(): RBAC + Zod + rate-limit + audit wrapper
│   ├── schemas.ts             # Zod schemas for auth flows
│   └── validation.ts          # Zod schemas for API boundaries
└── spec/
    └── content.tsx            # Blueprinted spec content (markdown-ish sections)
scripts/
├── kill-switch.ts             # CLI for toggling emergencyStop on an organization
├── rls-migration.sql          # Row Level Security policy definitions (18 tables)
├── run-rls.ts                 # Applies rls-migration.sql
└── apply-rls.cjs              # Alternate CommonJS applier
```

## Security model — TL;DR

- **Tenancy**: every tenant-scoped table has a composite `(organization_id, ...)` FK. RLS policies enforce `organization_id = current_setting('aegis.org_id')::uuid` on every row read/write by authenticated requests.
- **Auth**: Argon2-id hashing (`@node-rs/argon2`), 15-minute access tokens (JWT HS256), 7-day refresh tokens, httpOnly + secure + sameSite=lax cookies.
- **RBAC**: `viewer < auditor < engineer < security_lead < admin < owner` — checked in middleware *and* in the policy module that authorizes each scan stage.
- **Audit**: every state-changing route writes a row to `audit_logs` with `actor_user_id`, `target_type`, `target_id`, `ip`, `user_agent`, `payload`. Insert-only at the grant level.
- **Kill switch**: `organizations.emergency_stop` short-circuits `getAuthContext()` and the policy preflight. Toggle via `npm run kill-switch on|off`.
- **Anti-SSRF**: forbidden IP ranges (RFC1918 + cloud metadata + loopback), DNS pinning with per-request re-resolve, redirect re-check per hop, scheme allowlist.
- **Secrets**: per-org DEK encrypted with KMS master key (envelope encryption). AES-256-GCM with AAD binding (`organization_id || purpose`). Decrypted in memory only, redacted via `redact()` in logs and exports.

See `/spec/threat-model`, `/spec/rbac`, `/spec/api`, `/spec/tenancy` for the long-form definitions.

## Deployment notes

- **Vercel** is the recommended target for the control-plane (`npm run build` → Vercel auto-detects Next.js).
- **Workers** (crawler, passive engine, active engine, normalizer) are designed to run as isolated Fly.io Machines — they receive mTLS-secured job claims from pgboss, run their stage in a clean ephemeral container, then write evidence to S3/R2 and update Postgres.
- **Postgres** must run on Neon (or any Postgres 16+ with row-level security + the `pgcrypto` extension enabled).
- **Evidence** should live in S3-compatible object storage with bucket policy denying any PUT that doesn't come from a worker identity.

## License

Internal/unspecified. Treat the contents as a reference architecture; copy what you need, redact what you don't.
