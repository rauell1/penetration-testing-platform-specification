# Aegis — Agent Guide

This file tells AI coding agents everything they need to know about this project.
Read it at the start of every session to understand context, goals, and conventions.

## Project — Two Goals

This repository serves two purposes:

### Goal A (✅ 100% complete) — Polished Reference Architecture

A production-shaped specification and reference implementation for an authorized, OWASP WSTG-aligned web application penetration-testing SaaS. Everything works end-to-end with real Postgres data.

**What exists:**
- 20+ spec pages documenting every design decision
- Next.js 16 App Router dashboard with real Drizzle/Neon Postgres backend
- Full auth flow: login, register, logout, JWT access/refresh tokens, Argon2 hashing, RBAC
- 5 live data pages: Dashboard, Findings, Scans, Audit Log, Targets (all with search/filter UIs)
- Security: edge middleware route protection, per-org emergency kill switch, audit logging, rate limiting, Row Level Security
- UI: dark theme, responsive Shell sidebar, Toast notifications, loading skeletons, 404/error boundaries
- Scripts: seed data, kill-switch CLI, RLS migration

### Goal B (🔄 In planning) — Production Build-Out

Starting from Goal A's solid foundation, build the actual scanning infrastructure and operational tooling needed to run as a real SaaS.

**Key file:** `src/app/build-plan/page.tsx` — the interactive roadmap for Goal B.

## Technical Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.6 (App Router) |
| Language | TypeScript 5.9 |
| Database | Neon Postgres via `@neondatabase/serverless` + Drizzle ORM 0.45.2 |
| Auth | JWT (HS256 via `jose`), Argon2 hashing (`@node-rs/argon2`) |
| Styling | Tailwind CSS 4.1 (dark theme, no shadcn/ui — custom `Shell.tsx` + `atoms.tsx`) |
| Icons | lucide-react |
| Validation | Zod 3.25.76 |
| Queue (planned) | pgboss (schema exists in `src/db/schema.ts`) |
| Workers (planned) | Fly.io Machines with mTLS job claims |

## Important Conventions

### Drizzle ORM — NEVER use `db.query`
Always use `db.select().from(table).where(eq(table.column, value))` pattern.
`db.query` requires the schema generic on the DB type, which is NOT configured.

✅ Correct:
```ts
const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
```

❌ Wrong:
```ts
const user = await db.query.users.findFirst({ where: (u) => u.email === email });
```

### Auth — Server components
Call `requireAuth()` from `@/lib/server-auth` in any page that needs auth.
It reads the `aegis_access` cookie, verifies the JWT, and returns `{user, organization, membership}` or redirects to `/auth/login`.

### Auth — API routes
Use `withMiddleware()` from `@/lib/auth-middleware` for API routes.
It handles body validation (Zod), rate limiting, audit logging, and optional RBAC.

### Columns — `displayName` not `name`
The `users` table has `displayName` column (mapped to `display_name` in Postgres).
Never use `user.name` — use `user.displayName`.

### Zod version
The project uses zod@3.25.76. Avoid zod@4 features (e.g., `z.enum` with 2-3 args that changed in v4).

### Imports — Path aliases
Use `@/` prefix for all internal imports:
```ts
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyToken } from "@/lib/auth";
```

### New pages
- Pages go in `src/app/<name>/page.tsx`
- Server component by default; use `"use client"` only when needed
- Wrap with `<Shell activePath="/<name>">` + `<PageHeader>` + `<SectionCard>`
- Client sub-components go in `src/app/<name>/<Name>Table.tsx` or similar

### New API routes
- Routes go in `src/app/api/<name>/route.ts`
- Use `withMiddleware()` for auth/validation/audit
- Export named exports: `export const POST = withMiddleware(...)`

## File Layout

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # API routes
│   ├── auth/               # Login + register pages
│   ├── build-plan/         # Goal B roadmap
│   ├── dashboard/          # Live security posture
│   ├── targets/            # Managed scan targets
│   ├── scans/              # Scan runs
│   ├── findings/           # Normalized findings
│   ├── audit/              # Append-only audit log
│   ├── spec/               # 20+ blueprint deep-dive pages
│   ├── page.tsx            # Spec showcase homepage
│   ├── layout.tsx          # Root layout (wraps ToastProvider)
│   ├── not-found.tsx       # 404 page
│   └── error.tsx           # Error boundary
├── components/
│   ├── Shell.tsx           # Global sidebar layout + PageHeader + SectionCard
│   ├── atoms.tsx           # SeverityChip, Pill, Stat, RunStatusBadge, StateBadge
│   ├── LogoutButton.tsx    # Client component for sign-out
│   ├── aegis/              # Static showcase data
│   └── ui/                 # Toast, Loading, Skeleton, TableFilter
├── db/
│   ├── schema.ts           # Drizzle schema (18 tables)
│   ├── index.ts            # Drizzle client
│   └── seed.ts             # Demo seed
├── domain/                 # Pure TS: scope, fingerprint, policy, types
├── lib/
│   ├── auth.ts             # JWT, hashing, rate limit, audit log
│   ├── auth-middleware.ts  # withMiddleware(): RBAC + Zod + rate-limit + audit
│   ├── server-auth.ts      # requireAuth() for server components
│   ├── schemas.ts          # Auth Zod schemas
│   └── validation.ts       # API Zod schemas
├── middleware.ts           # Edge middleware — protects all routes except public
└── spec/                   # Spec content sections
scripts/
├── kill-switch.ts          # CLI: npm run kill-switch on|off|status|list
├── run-rls.ts              # Applies RLS migration
└── rls-migration.sql       # RLS policy definitions
```

## Common Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start dev server (localhost:3000) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` | Push Drizzle schema to Neon |
| `npm run db:seed` | Insert demo data |
| `npm run kill-switch` | Toggle `emergencyStop` on an org |

## Current State (July 2026)

- **Goal A: complete.** All spec pages, auth, data pages, security features, UI polish done.
- **Goal B: not started.** The `build-plan` page documents what needs to be built.
- Typecheck and lint both pass clean.
- No breaking changes pending.
