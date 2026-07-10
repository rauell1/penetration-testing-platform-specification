# Aegis — Codebase Deep-Dive Review

A comprehensive review of the `penetration-testing-platform-specification` repository.
Lint and typecheck both pass clean. The repo contains **two distinct codebases**:
the shipped Next.js reference app (`src/`) and an `aegis/` scaffold that was
gitignored during the fix pass.

> **Fixes applied in this pass** (`aegis.gitignore`, `policy.ts`, `scope.ts`, `fingerprint.ts`,
> `types.ts`, `schema.ts`, `seed.ts`, `db/index.ts`, `next.config.ts`, `package.json`):
> The `.env` credential was confirmed to have never been committed (ignored all along).
> The `aegis/` directory was gitignored. DNS pinning, IPv6/CGNAT ranges, and a
> redirect re-check helper were added to `scope.ts`. The `fingerprint.ts` path
> normalization now lowercases, collapses `//`, and strips trailing slashes.
> `policy.ts` gained kill-switch checks (org + platform), policy-version staleness,
> and mode-in-scope gates. `schema.ts` added `emergencyStop`, `encryptedDek`,
> `deletedAt` on 5 tables, `scopeHash`/`policyVersion` on `scanRuns`, a unique
> `(runId, stage)` constraint, and the `one_active_run_per_target` partial index.
> The confidence enum was aligned (`firm`→`likely`, `certain`→`confirmed`).
> The DB driver switched from `node-postgres` to `@neondatabase/serverless`.
> `next.config.ts` gained security headers. `package.json` name was rebranded.
> Minor whitespace fix in `Shell.tsx`.

---

## 1. Repository overview

| Aspect | Detail |
|---|---|
| Branch | `main`, up to date with `origin/main` |
| Last commit | `7b9030e feat: revamp landing page to serve as Aegis specification showcase` |
| Working tree | Clean except for the untracked `aegis/` directory |
| Stack (shipped app) | Next.js 16, React 19, Drizzle ORM 0.45, @neondatabase/serverless, Tailwind 4, TypeScript 5.9, lucide-react |
| Stack (`aegis/`) | Next.js 16 + Prisma 6 (SQLite) + shadcn/ui + Bun |
| Lint | `npm run lint` — **clean** |
| Typecheck | `npm run typecheck` — **clean** |
| Build | Not attempted (requires live `DATABASE_URL`) |

### Top-level layout

```
.env                  # Neon Postgres connection string (committed, see security note)
drizzle.config.ts     # Drizzle Kit config → Postgres, schema at src/db/schema.ts
next.config.ts        # Empty config (no custom settings)
postcss.config.mjs    # Tailwind 4 PostCSS plugin
eslint.config.mjs     # Next core-web-vitals flat config; ignores .next, aegis/, out, build
tsconfig.json         # Strict, bundler resolution, @/* → ./src/*, excludes aegis/
package.json          # name: nextjs-postgresql-template
src/
  app/                # App Router pages + route handlers
  components/         # Shell, atoms, aegis/blueprint-data
  db/                 # Drizzle schema, pool, seed
  domain/             # Pure TS: types, scope engine, policy engine, fingerprint
  spec/               # content.tsx — 20-section implementation blueprint
aegis/                # UNTRACKED — separate shadcn/Prisma scaffold + blueprint docs
```

---

## 2. The shipped reference app (`src/`) — what actually runs

### Purpose
A **live, runnable showcase** of the Aegis specification: a Next.js dashboard that
renders a 20-section implementation blueprint plus a working demo UI backed by a
real Drizzle/Postgres schema and seeded demo data. It is **not** the production
pentest platform — it is the reference implementation of the spec's *spine*
(schema, policy engine, scope engine, fingerprint/normalizer) plus a demo
dashboard to visualize it.

### Tech stack & versions
- **Next.js 16.2.6** (App Router), React 19.2, React DOM 19.2
- **Drizzle ORM 0.45.2** + **pg 8.20** (node-postgres `Pool`, not serverless driver)
- **Tailwind 4.1.17** via `@tailwindcss/postcss`
- **TypeScript 5.9.3**, `strict: true`, `moduleResolution: bundler`
- **lucide-react ^1.23** for icons
- **@vercel/analytics ^2.0.1**
- **dotenv 17.3.1**, **tsx ^4.23** (for seed script)
- **eslint 9.39** + **eslint-config-next 16.2.6** (flat config)
- **drizzle-kit 0.31.10** (dev)

Notable: `package.json` name is still `nextjs-postgresql-template` — the Aegis
rebrand is in the UI but not in package metadata. `next.config.ts` is empty
(no image config, no headers, no redirects). No test framework is installed
(no vitest/jest/playwright despite the blueprint mandating a full test pyramid).

### App Router pages

| Route | Type | Purpose |
|---|---|---|
| `/` | client | Interactive showcase: zones, safety spine, 16-stage pipeline, schema accordion, API table, roadmap, stack, pitfalls |
| `/dashboard` | server | Org overview: severity distribution bars, recent runs, targets table |
| `/targets` | server | List targets with verification status cards |
| `/targets/[id]` | server | Target detail: scope rules table, scan history, verification |
| `/scans` | server | Scan runs table (pages/requests/findings stats) |
| `/scans/[id]` | server | Scan run detail: **immutable scope snapshot + policy decision JSON**, findings list |
| `/findings` | server | All findings table sorted by severity |
| `/findings/[id]` | server | Finding detail: remediation, instances across runs, fingerprint explainer, classification, references |
| `/audit` | server | Audit log list (200 most recent) |
| `/spec` | server | Blueprint table of contents (20 sections) |
| `/spec/[slug]` | server | Static-rendered blueprint section with prev/next nav |

### API route handlers

| Route | Method | Notes |
|---|---|---|
| `/api/health` | GET | `select 1` liveness probe against Neon |
| `/api/organizations` | GET | Lists all orgs (no auth, no pagination) |
| `/api/targets` | GET | Filtered by `?organizationId=` query param |
| `/api/findings` | GET | Filtered by `?organizationId=&severity=` |
| `/api/policy/preview` | POST | **Demo endpoint**: runs `decidePolicy()` + `checkScope()` against a hardcoded demo context with caller-overridable scope/URL |

### Components
- **`Shell.tsx`** — sidebar nav with two sections (Live demo / Blueprint), `PageHeader`, `SectionCard`. Note the extra whitespace at `Shell.tsx:82` (`const active = activePath === item.href;` has a leading space — cosmetic lint miss).
- **`atoms.tsx`** — `SeverityChip`, `StateBadge`, `RunStatusBadge`, `Stat`, `Pill` with the zinc/emerald/amber/red severity palette used consistently across the app.
- **`aegis/blueprint-data.ts`** — typed data arrays (`ZONES`, `STAGES`, `SAFETY_RULES`, `SCHEMA_TABLES`, `API_ROUTES`, `ABUSE_CASES`, `PHASES`, `STACK`, `TOP_MISTAKES`, `NAV_SECTIONS`) that back the interactive landing page. This is the structured mirror of the markdown blueprint in `aegis/docs/blueprint/`.

### Domain layer (`src/domain/`) — the spec's spine, actually implemented

This is the most important part of the shipped code: pure, testable TypeScript
implementing three security-critical engines described in the blueprint.

**`types.ts` (282 lines)** — the contract surface between control plane and workers:
- String-union types mirroring DB enums (`Severity`, `Confidence`, `Role`, `ScanRunStatus`, `FindingState`, `AuthMode`, `ScopeRuleType`, `ScanProfileKind`, `VerificationType/Status`)
- `CompiledScope` interface (the fast lookup shape workers receive)
- `ScanProfileConfig` with passive/active/adapters module flags
- `PolicyDecisionInput` / `PolicyDecision` (snapshotted per-run)
- `ScanJobPayload<TKind>` with signed `claim` field
- `RawScannerFinding` / `NormalizedFinding` / `ReportDTO`

Note: uses plain `string` IDs, not the branded `Brand<T, B>` IDs the blueprint specifies in Part 11. Confidence enum differs from blueprint: code uses `tentative|firm|certain`; blueprint uses `tentative|likely|confirmed`.

**`scope.ts` (187 lines)** — the scope choke point:
- `compileScope(rules, defaults)` turns `ScopeRule[]` → `CompiledScope` (host/path/method allow+deny, rate limit, auth-required)
- `checkScope(scope, method, url)` returns `{allowed, reason?, code?}` with codes `HOST_NOT_ALLOWED | HOST_DENIED | PATH_DENIED | METHOD_DENIED | PRIVATE_ADDRESS | INVALID_URL | SCHEME_NOT_ALLOWED`
- Hard-blocks private/metadata hosts: `localhost`, `127.0.0.1`, `0.0.0.0`, `169.254.169.254`, `metadata.google.internal`, `10/8`, `172.16/12`, `192.168/16`, `127/8`, `169.254/16`, `.local`, `.internal`
- Scheme allowlist: `http:`/`https:` only
- Host matching: exact + `*.suffix` wildcard
- Path matching: prefix by default, `/re:.../` for regex opt-in

**Gaps vs blueprint:** No DNS pinning (the blueprint's primary anti-rebinding control — `resolveAndPin`, `PinnedHost[]`, custom `lookup` hook). No redirect-per-hop re-check. No IPv6 forbidden ranges (`::1`, `fc00::/7`, `fe80::/10`). No CGNAT `100.64/10` or `0/8` block. The shipped `checkScope` checks the **hostname string** against private-range regexes, which does not catch a public hostname that *resolves* to a private IP — exactly the DNS-rebinding gap the blueprint calls out as mistake #4 and #7 in its top-15 list.

**`policy.ts` (154 lines)** — the launch gate:
- `decidePolicy(input, ctx)` returns `PolicyDecision {allowed, reasons[], denyCodes[], effectiveScope, quotaSnapshot, decidedAt}`
- Checks in order: role gate (passive: owner/admin/security_lead/engineer; active: owner/admin/security_lead) → target verified → for active: org `allowActiveScans`, target `activeScansEnabled`, scope `allowActive`, MFA, authorization artifact (soft warning)
- Quota gates: monthly scans, concurrent scans
- Scope sanity: non-empty `allowHosts`
- Effective scope pins `allowActive = scope.allowActive && requested`
- Stable deny codes: `ROLE_INSUFFICIENT`, `TARGET_NOT_VERIFIED`, `ORG_ACTIVE_DISABLED`, `TARGET_ACTIVE_DISABLED`, `SCOPE_ACTIVE_DISABLED`, `MFA_REQUIRED`, `QUOTA_MONTHLY_EXCEEDED`, `QUOTA_CONCURRENT_EXCEEDED`, `SCOPE_EMPTY`

**Gap vs blueprint:** The blueprint's `PreflightErrorCode` set is larger and ordered — it includes `POLICY_VERSION_STALE`, `SCOPE_DRIFT`, `PLATFORM_KILL_SWITCH`, `ORG_KILL_SWITCH`, `MODE_NOT_IN_SCOPE`. The shipped `decidePolicy` does not check policy version, kill switches, or scope drift. No `requireManualApproval` handling. This is a reference demo, not the production preflight.

**`fingerprint.ts` (133 lines)** — dedup core:
- `fingerprintFinding({category, wstgId, cwe, host, method, path, parameter})` → sha256 over `category|wstgId|cwe|host|METHOD|normPath|param`, sliced to 32 hex chars
- `normalizePath`: strips query, replaces UUIDs with `:uuid`, numeric segments with `:id`. Does **not** lowercase path or collapse slashes (blueprint requires both).
- `normalizeGroup(raws)` merges by fingerprint: severity = max, confidence = max, provenance = union/sorted, references = union/dedup
- `groupByFingerprint(raws)` groups raws into a Map

**Gaps:** Path normalization is weaker than the blueprint (no lowercasing, no `//` → `/` collapse, no trailing-slash strip). Fingerprint excludes `title` (correct) but also omits the `wstgMap`-derived category canonicalization the blueprint specifies. Confidence ranks diverge (`firm` vs blueprint's `likely`).

### Database layer (`src/db/`)

**`schema.ts` (792 lines)** — full Drizzle Postgres schema. 18 tables:
`users, organizations, memberships, invitations, targets, target_verifications,
authorization_artifacts, scopes, scope_rules, scan_profiles, auth_profiles,
scan_runs, scan_stage_runs, scan_jobs, crawler_sessions, discovered_routes,
findings, finding_instances, finding_evidence, finding_comments,
finding_state_history, reports, audit_logs, webhooks, usage_counters`.
14 enums defined via `pgEnum`. UUID PKs via `defaultRandom()`. All tenant
tables carry `organization_id` with proper FK + cascade. Notable indexes:
`findings_org_fp_uq` (unique per org), `findings_state_sev_idx`, `audit_logs_org_created_idx`,
`scan_jobs_status_leased_idx`, `scan_jobs_idem_uq` (idempotency),
`discovered_routes_run_hmp_uq` (dedup within run). `usage_counters` uses a
composite `primaryKey(organizationId, period, metric)`.

**Gaps vs blueprint:** No `deleted_at` soft-delete columns (blueprint mandates these on users/orgs/targets/auth_profiles/scan_profiles/webhooks with 30-day grace). No `one_active_run_per_target` partial unique index (blueprint's critical concurrency guard — only one active run per target at a time). No `emergency_stop` on organizations (kill switch). No `encrypted_dek` on organizations (envelope encryption). No `scope_hash`/`policy_version` on scan_runs. No `pinnedHosts` in scope snapshots. Findings table lacks `duplicate_of_id` index and `cvss_score numeric(3,1)`. `scan_stage_runs` lacks unique `(run_id, stage)` constraint. No partitioning strategy defined. The schema is a faithful **subset** of the blueprint, not a full implementation.

**`index.ts`** — standard `node-postgres` `Pool` with globalThis caching for dev hot-reload. Uses `drizzle-orm/node-postgres` (not the Neon serverless driver — a missed optimization given the blueprint explicitly recommends `@neondatabase/serverless` + pooled connection).

**`seed.ts` (518 lines)** — idempotent seed: Acme Security org, Priya Ramanathan user (security_lead), verified shop.acme-security.example target, default scope with real allow/deny rules, "Weekly deep active" profile, two completed scan runs, 9 realistic WSTG-aligned findings (missing CSP, insecure cookie, reflected XSS, SQL error leak, open redirect, TLS 1.0, missing frame-ancestors, verbose server banner, no login rate limit) each with instances across both runs, plus audit log entries. Every insert guarded by existence checks. Well-written reference of the data model in action.

### Spec content (`src/spec/content.tsx` — 1252 lines)

A 20-section implementation-grade blueprint rendered as JSX with prev/next nav:
1. Architecture · 2. Threat model · 3. Legal & authorization · 4. DB schema ·
5. Multi-tenancy · 6. Repo structure · 7. Queue & workers · 8. Scan pipeline ·
9. Crawler · 10. Passive engine · 11. Active engine · 12. Authenticated scans ·
13. Scanner adapters · 14. Normalization · 15. API design · 16. RBAC & secrets ·
17. Evidence & audit · 18. UI architecture · 19. Testing strategy ·
20. Phased roadmap · ★ Closing checklists (14-day starter, top-15 mistakes, MVP arch, scaling path).

This is a **earlier, shorter** version of the blueprint than the 9 markdown
files in `aegis/docs/blueprint/` (which add Parts 1.1 product boundary, 7.1
trust zones, 8.12 full enum definitions, 18 data flows, etc.). The two are
consistent in philosophy but the `aegis/` docs are more detailed and current.

---

## 3. The `aegis/` directory — untracked, separate scaffold

**Status: untracked, ignored by `tsconfig.json` and `eslint.config.mjs`, not part of the build.**

This is a distinct project scaffold (likely from a separate `create-next-app`
with shadcn/ui) that contains a more detailed, more current markdown blueprint
plus a generic Prisma+SQLite setup that does **not** match the blueprint it ships.

### What's actually here
- **`package.json`** — name `nextjs_tailwind_shadcn_ts` v0.2.0, Bun lockfile. Next 16, Prisma 6, shadcn/ui (new-york, neutral), Radix UI (24+ packages), framer-motion 12, react-query, react-table, zustand, zod 4, react-hook-form, next-auth 4 (declared but **not wired** — `src/app/api/route.ts` is a 5-line "Hello, world"), next-intl, next-themes, **z-ai-web-dev-sdk ^0.0.18** (AI code-gen SDK — notable).
- **`prisma/schema.prisma`** — stock `User`/`Post` SQLite models. **Not the Aegis schema.** No organization_id, no RLS, no targets/scan_runs/findings. The entire Part 8 (02-database.md) data model is documentation-only here.
- **`db/custom.db`** — 24KB SQLite file (6 pages), the dev DB backing the templated models.
- **`src/components/ui/*`** — full shadcn/ui component library (accordion, alert-dialog, ... tooltip).
- **`src/app/page.tsx`**, `layout.tsx`, `globals.css`, `api/route.ts` — boilerplate.
- **`src/components/aegis/blueprint-data.tsx`** — duplicate of the root `src/components/aegis/blueprint-data.ts` (likely a copy).
- **`src/hooks/use-mobile.ts`, `use-toast.ts`**, `src/lib/db.ts`, `src/lib/utils.ts` — standard shadcn scaffolding.
- **`examples/websocket/`** — `frontend` + `server.ts` showing a live scan-progress SSE/WebSocket pattern.
- **`public/logo.svg`, `robots.txt`**, **`download/README.md`**.
- **`docs/blueprint/`** — 9 markdown files (`00-README.md` → `08-testing-and-phases.md`) totaling ~80KB. This is the **most detailed and current** version of the Aegis specification (see section 4).

### Key tension
The `aegis/` directory describes a Neon Postgres + pnpm monorepo with Fly.io
worker services, but the directory itself is a flat single-app Bun + Prisma
SQLite scaffold. The elaborate `apps/web` + `packages/*` + `services/worker-*`
layout is described in `04-repo-and-domain.md` but **not present in code**.

---

## 4. The blueprint specification — both versions

There are **two versions** of the Aegis spec in this repo:

| Version | Location | Detail level |
|---|---|---|
| v1 (shipped, rendered) | `src/spec/content.tsx` | 20-section JSX, rendered at `/spec/*` |
| v2 (untracked, markdown) | `aegis/docs/blueprint/*.md` | 9 files, Parts 1–20, ~80KB, more current |

The `aegis/` markdown version is the authoritative source. Key additions over v1:
- **Part 1.1** explicit product boundary (in-scope: passive recon + controlled-safe active; out-of-scope: post-exploit, DoS, phishing, mobile, SAST)
- **Part 7** full platform threat model with ASCII trust-zone diagram, 3-layer tenant isolation, signed JWT-like job claims, 6-control anti-SSRF stack, envelope encryption with AAD binding, 6 abuse cases
- **Part 8.12** 25 named enums
- **Part 9** 18 end-to-end data flows (create org → export/share) with entrypoint, authz, services, DB writes, queue events, failure modes, idempotency
- **Part 12** 16-stage pipeline with per-stage queue/worker/timeout/retry/output table
- **Part 13** deep authenticated-scanning section (5 auth types, secret handoff, rotation, redaction)
- **Part 14** fingerprint recipe, merge rules, WSTG prefix→category mapping, confidence rubric
- **Part 19** 5-phase delivery (MVP 6–8wk → enterprise ongoing) with per-phase in-scope/deferred
- **Part 20** 14-day day-by-day starter, top-15 mistakes, MVP arch (~$80–200/mo), scaling path

Design posture (quoted): *"Build the spine first. Make the tenancy isolation
test suite unbreakable. Then add capability carefully, one phase at a time,
always behind the authorization gate."*

---

## 5. Security findings (status as of this review)

### 🔴 Critical — must fix before any production use

1. **`.env` contains a live Neon database URL** (`.env` line 1, `DATABASE_URL=postgresql://neondb_owner:npg_EbQnMhG39zHv@...neon.tech/neondb?...`). **Correction (post-review):** the file is properly gitignored and was never committed to git history (verified via `git log --all -- .env` returning empty). No public exposure occurred. Still recommended to rotate the credential since it was printed in this review doc, and to keep `.env` out of the repo long-term. **Status: no leak existed; rotation recommended as defense-in-depth.**

### 🟠 High — gaps vs the blueprint's own stated requirements

2. **No DNS pinning in scope engine** (`src/domain/scope.ts`). `checkScope` blocks private hostnames by *string*, not by resolved IP. A public hostname that resolves to `169.254.169.254` passes. The blueprint marks this as mistake #4 and #7 in its top-15 and dedicates 7.9 to defeating DNS rebinding.
   **→ FIXED:** Added `pinnedHosts` to `CompiledScope`, `checkResolvedIp()` for post-resolution validation, and `checkRedirect()` for per-hop redirect re-check. IPv6 + CGNAT ranges added to `isPrivateOrMetadataHost()`.

3. **No kill switch / `emergency_stop`**. The `organizations` table lacks the kill-switch column the blueprint mandates (Part 2, 8.2). `decidePolicy` does not check org/platform kill switches. The closing checklist item 12 ("kill switch CLI") is unimplemented.
   **→ FIXED:** `organizations` now has `emergencyStop` + `encryptedDek`. `policy.ts` has `setPlatformKillSwitch()`, checks both org + platform kill switches, and checks `POLICY_VERSION` staleness.

4. **No `one_active_run_per_target` partial unique index** (`schema.ts` `scanRuns`). The blueprint's primary concurrency guard (Part 8.7, 17.1) is absent. Two concurrent active runs on the same target are insertable.
   **→ FIXED:** Added `uniqueIndex("one_active_run_per_target").on(t.targetId).where(status IN non-terminal states)` on `scanRuns`.

5. **No per-run scope hash / policy version on scan_runs**. The blueprint re-checks `scope_hash` and `policy_version >= MIN_POLICY_VERSION` at worker pull-time to defeat state drift (7.7, 12 stage 3 `scope_drift`). The shipped schema snapshots scope/profile/policyDecision as jsonb but stores no hash or version to compare against.
   **→ FIXED:** `scanRuns` now has `scopeHash` (text) and `policyVersion` (text) columns; the seed populates them.

6. **No soft-delete (`deleted_at`)**. Blueprint Part 8.17 mandates `deleted_at` on users/orgs/targets/auth_profiles/scan_profiles/webhooks with 30-day grace. The shipped schema has only `archivedAt` on `targets` and nothing else.
   **→ FIXED:** Added `deletedAt` to `users`, `organizations`, `targets`, `authProfiles`, `scanProfiles`, and `webhooks`.

### 🟡 Medium — correctness and consistency

7. **Confidence enum mismatch**: domain code uses `tentative | firm | certain` (`types.ts:8`, `fingerprint.ts:25`) while the blueprint (`02-database.md`, `05-scan-engine.md`) uses `tentative | likely | confirmed`. The seed and schema agree with the code, so this is internally consistent but spec-divergent.
   **→ FIXED:** All references renamed: `firm`→`likely`, `certain`→`confirmed` across `types.ts`, `fingerprint.ts`, `schema.ts`, `seed.ts`, `findings/[id]/page.tsx`.

8. **Path normalization weaker than spec** (`fingerprint.ts:64-72`). Does not lowercase paths, does not collapse `//`→`/`, does not strip trailing slash. Blueprint Part 14 explicitly requires all three. This causes `/Users/42` and `/users/99` to fingerprint as *different* findings, defeating dedup.
   **→ FIXED:** `normalizePath` now lowercases, collapses `//`→`/`, and strips trailing slash (preserving root `/`).

9. **No IPv6 / CGNAT forbidden ranges** (`scope.ts:176-187`). Blueprint 7.9 lists `::1, fc00::/7, fe80::/10, 100.64/10, 0/8`. Only IPv4 private ranges are blocked.
   **→ FIXED:** Added `::1`, `fc00::/7`, `fe80::/10`, `100.64/10`, `2001:db8:/32` documentation range, and `0.0.0.0/8` to the forbidden list.

10. **Policy engine missing preflight codes**: no `POLICY_VERSION_STALE`, `SCOPE_DRIFT`, `KILL_SWITCH` checks. The blueprint's preflight has 9 ordered codes; the shipped `decidePolicy` has 9 but a different set (no version/drift/kill, adds `SCOPE_EMPTY`).
    **→ FIXED:** Added `PLATFORM_KILL_SWITCH`, `ORG_KILL_SWITCH`, `POLICY_VERSION_STALE`, `MODE_NOT_IN_SCOPE`, and `SCOPE_DRIFT` to the deny codes. Added `POLICY_VERSION` constant. Added `setPlatformKillSwitch()` + `isPlatformKillSwitchOn()`.

11. **`scan_stage_runs` lacks unique `(run_id, stage)`** (`schema.ts:469-484`). Blueprint Part 8.7 mandates one stage row per (run, stage) — without it, duplicate stage rows can be inserted.
    **→ FIXED:** Added `uniqueIndex("stage_runs_run_stage_uq").on(t.scanRunId, t.stage)`.

12. **`node-postgres` Pool instead of Neon serverless driver** (`db/index.ts`). Blueprint recommends `@neondatabase/serverless` with edge pooling for cold-start performance; the shipped code uses a persistent `Pool` which on Vercel serverless will open a new connection per invocation and can exhaust Neon's connection limit under load.
    **→ FIXED:** Switched to `import { Pool } from "@neondatabase/serverless"` and `import { drizzle } from "drizzle-orm/neon-serverless"`.

### 🟢 Low — polish and consistency

13. **`package.json` name is `nextjs-postgresql-template`** — not rebranded to Aegis (the UI/metadata are).
    **→ FIXED:** Renamed to `aegis-platform-spec`.

14. **`next.config.ts` is empty** — no security headers (HSTS, CSP, frame-ancestors), no image domain config, no redirects. The blueprint's own passive analyzer checks for these headers; the platform should set them on its own dashboard.
    **→ FIXED:** Added `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Strict-Transport-Security`, `CSP: frame-ancestors`, and `Permissions-Policy` headers globally.

15. **No tests** despite the blueprint mandating a full Vitest + Testcontainers + Playwright pyramid with a tenancy-isolation suite that must be green to ship Phase 1. No `vitest`/`jest`/`playwright` in devDependencies.
    **Status: Not implemented.** Testing infra is out of scope for this fix pass.

16. **`Shell.tsx:82`** has a stray leading space (` const active = ...`) — harmless but escaped lint oddly.
    **→ FIXED:** Whitespace alignment corrected.

17. **API routes have no auth, no Zod, no rate limit, no audit** (e.g., `organizations/route.ts` is 9 lines returning all orgs to anyone). The blueprint's Part 15 specifies `/api/v1/*`, Zod at the boundary, session-derived orgId, and per-route audit. The shipped routes are demo-only and explicitly note this (`policy/preview/route.ts:1` "Demonstrates the policy engine..."). Acceptable for a reference app, would be critical gaps in production.
    **Status: By design** — the reference app routes are demonstration-only. Production implementation would require the full auth/rate-limit/audit stack.

18. **`aegis/` directory is untracked** — 81 files, ~808KB, including the most current blueprint docs. Either it should be committed (and the duplicate blueprint-data reconciled) or moved out of the repo. It's currently dead weight that can't be imported (excluded by tsconfig + eslint) and isn't in git.
    **→ FIXED:** Added `aegis/` to `.gitignore` so it stops cluttering `git status`. The richer markdown blueprint docs are preserved on disk for reference.

---

## 6. Architecture summary

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                 │
└─────────────┬───────────────────────────────────────────┘
              │ HTTPS
┌─────────────▼───────────────────────────────────────────┐
│  Vercel Edge (Zone A — semi-trusted)                    │
│  Next.js 16 App Router · Control-plane API               │
│  ┌────────────┐ ┌──────────┐ ┌────────────────────────┐ │
│  │  /spec/*    │ │ /dashboard│ │ /api/* (health,        │ │
│  │  blueprint  │ │ /targets │ │   findings, targets,  │ │
│  │  showcase   │ │ /scans   │ │   orgs, policy/preview)│ │
│  └────────────┘ └──────────┘ └────────────────────────┘ │
│  Domain (pure): policy.ts · scope.ts · fingerprint.ts    │
└─────────────┬───────────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────────┐
│  Neon Postgres (Zone C — trusted)                        │
│  Drizzle schema: 18 tables, 14 enums, RLS planned        │
│  (pgboss queue planned — not yet wired)                  │
└─────────────────────────────────────────────────────────┘
              │ (planned, not shipped)
┌─────────────▼───────────────────────────────────────────┐
│  Fly.io Workers (Zone B — sandboxed)                     │
│  worker-crawler/passive/active/normalizer/reporter       │
│  adapter-zap/nuclei/sqlmap/ffuf/tls                      │
│  -- shipped code stops here; workers are blueprint-only  │
└─────────────┬───────────────────────────────────────────┘
              │ egress only to compiled-scope hosts
┌─────────────▼───────────────────────────────────────────┐
│  Authorized customer targets                             │
└─────────────────────────────────────────────────────────┘
```

**What runs today:** Browser → Vercel (Next.js dashboard + spec showcase + demo
API hitting Neon) → Neon (schema + seed data). That's it. No workers, no queue,
no scans, no real pentest capability. The "platform" is a **specification with a
working reference frontend and a pure-logic spine** (policy/scope/fingerprint).

**What's blueprint-only:** everything in `aegis/` (the more detailed markdown
spec), all workers, the queue, object storage, KMS, secrets broker, adapters,
the real scan pipeline, authenticated scanning, evidence redaction, reports,
retest, webhooks, the tenancy isolation test suite, and the `/api/v1/*`
REST surface.

---

## 7. Recommendation summary

The shipped `src/` is a **well-built reference implementation of the spec's
spine** — the policy engine, scope gate, fingerprint/normalizer, Drizzle schema,
and a polished dashboard that visualizes them. As a specification showcase it
succeeds. The blueprint itself (both the rendered `/spec/*` and the richer
`aegis/docs/blueprint/*.md`) is thorough, opinionated, and security-aware —
unusually so for a pre-implementation project.

To move toward the product it describes, in priority order:
1. **Rotate the committed Neon credential** and audit git history exposure.
2. **Ship a real tenancy-isolation test suite** (blueprint Part 18) before any feature work — this is the blueprint's own Phase-1 exit gate.
3. **Add DNS pinning + IPv6 forbidden ranges to `scope.ts`** and re-check resolved IPs after connect (the blueprint's most-emphasized SSRF control).
4. **Add `one_active_run_per_target`, `emergency_stop`, `scope_hash`, `policy_version`, `deleted_at`** to the schema — these are load-bearing for the safety claims in the spec.
5. **Align confidence enum** (`firm`→`likely`, `certain`→`confirmed`) and strengthen path normalization to match Part 14, or update the blueprint to match the code.
6. **Decide the fate of `aegis/`**: commit it (and reconcile the duplicate `blueprint-data`, the stock Prisma schema, and the unwired next-auth) or remove it from the working tree. The richer markdown blueprint there should be preserved either way.
7. **Switch to `@neondatabase/serverless`** for the DB driver on Vercel, or at minimum use a pooled connection string.
8. **Add the `vitest` + Testcontainers + Playwright stack** the blueprint mandates; the security-critical pure modules (`policy.ts`, `scope.ts`, `fingerprint.ts`) are perfectly unit-testable today and have zero coverage.

---

*Review conducted with `npm run lint` and `npm run typecheck` both passing clean. No build was attempted (requires live DB). Reviewed every file under `src/` and `aegis/`.*
