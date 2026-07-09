import Link from "next/link";
import { ReactNode } from "react";

export interface SpecSection {
  slug: string;
  number: string;
  title: string;
  eyebrow: string;
  summary: string;
  body: ReactNode;
}

// Small formatting helpers used by the pages.
export const Code = ({ children }: { children: ReactNode }) => (
  <code>{children}</code>
);

export const Pre = ({ children }: { children: string }) => (
  <pre>{children}</pre>
);

export const SPEC_SECTIONS: SpecSection[] = [
  {
    slug: "architecture",
    number: "1",
    title: "Executive architecture summary",
    eyebrow: "Where things live and why",
    summary:
      "Vercel runs the control plane and the read-heavy UI. All long-running work lives on a separate, container-friendly worker fleet. Neon is the only stateful store. A durable queue with database-backed job leases coordinates them.",
    body: (
      <>
        <h2>Product boundary</h2>
        <p>
          <strong>SentinelDAST</strong> is an authorized web-application
          penetration-testing SaaS. Customers register targets, prove ownership,
          define scope, then run <em>passive</em> assessments by default and{" "}
          <em>controlled active</em> assessments once every gate is satisfied.
          Findings normalize into one internal model and flow through a
          lifecycle (new → triaged → confirmed → resolved / accepted risk / FP).
        </p>
        <p>
          It is <strong>not</strong> a general offensive framework. There is no
          post-exploitation, no persistence, no lateral-movement automation. The
          most invasive action is a rate-limited safe probe against a
          user-owned, verified target.
        </p>
        <h2>Physical layout</h2>
        <table>
          <thead>
            <tr>
              <th>Layer</th>
              <th>Runs on</th>
              <th>Responsibilities</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Dashboard + control plane</td>
              <td>Vercel (Next.js App Router)</td>
              <td>
                Auth, org/target management, scope + profile CRUD, finding UI,
                report viewer, launch/cancel endpoints, webhooks receiver
              </td>
            </tr>
            <tr>
              <td>Primary datastore</td>
              <td>Neon Postgres</td>
              <td>
                All tenancy, targets, scopes, runs, findings, audit logs, job
                rows. Extensions: <Code>pgcrypto</Code>, <Code>citext</Code>,{" "}
                <Code>pg_trgm</Code>
              </td>
            </tr>
            <tr>
              <td>Queue / orchestration</td>
              <td>Postgres-backed job table (primary) · Redis + BullMQ (fallback)</td>
              <td>
                Durable job leases, retries, cancellation, idempotency,
                fan-out/fan-in per scan run
              </td>
            </tr>
            <tr>
              <td>Worker fleet</td>
              <td>
                <strong>Primary: Fly.io Machines</strong> (auto-suspend, per-region, cheap idle) ·{" "}
                <strong>Alt: Railway worker services</strong> or Kubernetes on Hetzner
              </td>
              <td>
                Crawlers (HTTP + headless Chromium), passive analyzers, active
                probers, external tool adapters (ZAP/Nuclei/TLS), normalizer,
                report assembler
              </td>
            </tr>
            <tr>
              <td>Object storage</td>
              <td>Cloudflare R2 (primary) · S3 (alt)</td>
              <td>
                Redacted evidence blobs, PDF reports, uploaded LOA documents
              </td>
            </tr>
            <tr>
              <td>Secrets</td>
              <td>AWS KMS / GCP KMS envelope + Doppler for worker env</td>
              <td>
                Auth-profile credential material NEVER lives cleartext in Postgres
              </td>
            </tr>
            <tr>
              <td>Observability</td>
              <td>OpenTelemetry → Grafana Cloud (traces + logs + metrics)</td>
              <td>
                Per-scan-run trace, per-worker span, structured logs with
                redaction middleware
              </td>
            </tr>
          </tbody>
        </table>
        <h2>What must not run on Vercel</h2>
        <ul>
          <li>Anything that opens sockets to customer targets</li>
          <li>Anything holding a headless browser session</li>
          <li>Anything with a &gt; 60s wall clock</li>
          <li>Anything spawning subprocess adapters (ZAP, Nuclei, sqlmap safe-mode, testssl)</li>
          <li>The scope-checked HTTP wrapper (it needs long-lived connection pools + local DNS overrides)</li>
        </ul>
        <p>
          Vercel <em>does</em> host the launch endpoint. Launch is a fast
          transaction: policy preflight → insert scan_run + initial jobs →
          return. The workers pick it up from there.
        </p>
      </>
    ),
  },
  {
    slug: "threat-model",
    number: "2",
    title: "Threat model for the platform itself",
    eyebrow: "How the platform gets attacked and how it survives",
    summary:
      "A security tool that gets subverted becomes a weapon. We enumerate the six abuse cases that matter and pin each to a concrete mitigation in the architecture.",
    body: (
      <>
        <h2>Attacker profile</h2>
        <p>
          The primary attacker is <strong>a paying but hostile customer</strong>{" "}
          who wants to weaponize our infrastructure. Secondary attackers include
          curious cross-tenant users, a compromised worker container, and an
          outside attacker who obtains an API token.
        </p>
        <h2>Abuse cases and mitigations</h2>
        <table>
          <thead>
            <tr>
              <th>Abuse case</th>
              <th>Where it lives</th>
              <th>Mitigation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Scan an unauthorized third-party target</td>
              <td>Target creation → scan launch</td>
              <td>
                Verification-required policy gate. Active scans additionally
                require org opt-in + target opt-in + role check + optional
                signed LOA on file.
              </td>
            </tr>
            <tr>
              <td>SSRF via crafted target URL (metadata service, RFC1918)</td>
              <td>Worker HTTP wrapper</td>
              <td>
                Central <Code>scope.checkScope()</Code> hard-blocks{" "}
                <Code>169.254.169.254</Code>, RFC1918, loopback, <Code>.internal</Code>,{" "}
                <Code>.local</Code>. Uses a custom DNS resolver that re-checks
                the resolved IP <em>after</em> DNS to defeat rebinding.
              </td>
            </tr>
            <tr>
              <td>Exfiltrate secrets from other tenants</td>
              <td>Any read path</td>
              <td>
                All queries carry <Code>organization_id</Code> in a WHERE. RLS
                is on. Auth secrets never sit in Postgres cleartext — Postgres
                only holds a <Code>secret_ref</Code> pointer into KMS-enveloped
                storage.
              </td>
            </tr>
            <tr>
              <td>Cross-tenant lookup by ID guessing</td>
              <td>API handlers</td>
              <td>
                UUIDs are v4. Every read/write goes through a
                <Code>withOrgScope(session, orgId, fn)</Code> wrapper that fails
                closed if the requested resource does not belong to the actor&apos;s
                org.
              </td>
            </tr>
            <tr>
              <td>Poisoned upload (LOA PDF, HAR file, session artifact)</td>
              <td>Upload endpoints</td>
              <td>
                Size cap, MIME allowlist, virus scan via ClamAV worker before
                the object becomes readable. HAR/OpenAPI parsers run inside a
                dedicated worker with no outbound network.
              </td>
            </tr>
            <tr>
              <td>Worker compromise</td>
              <td>Worker VM</td>
              <td>
                Workers hold <em>only</em> the signed job claim for the run
                they&apos;re processing; no long-lived credentials. Egress is
                pinned to a NAT with an allowlist; auth credentials come from
                KMS decrypt at job-start and are wiped from memory on job end.
              </td>
            </tr>
          </tbody>
        </table>
        <h2>Non-goals</h2>
        <ul>
          <li>We do not defend against a state-level attacker with physical access.</li>
          <li>We do not attempt to prevent a legitimate user from testing their <em>own</em> production with bad judgment — we surface warnings, but consenting adults on verified assets.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "legal",
    number: "3",
    title: "Legal & authorization model",
    eyebrow: "Consent is a data model, not a checkbox",
    summary:
      "Ownership verification and authorization artifacts are first-class rows with lifecycle. Every scan snapshots the authorization state that permitted it, so a year later we can prove exactly why we sent that request.",
    body: (
      <>
        <h2>Verification types</h2>
        <ul>
          <li>
            <strong>DNS TXT</strong> — we generate a challenge like{" "}
            <Code>sentinel-verify=b7f3a9e21c4d</Code>; a worker resolves the TXT
            record from three geographically diverse resolvers and requires 2/3
            agreement before flipping <Code>status=verified</Code>.
          </li>
          <li>
            <strong>HTTP file</strong> — the customer serves a file at{" "}
            <Code>/.well-known/sentinel-verify/&lt;token&gt;</Code>. Fetched
            with a fresh connection, no redirects followed, size cap 256B.
          </li>
          <li>
            <strong>Meta tag</strong> — HTML meta discovered on the target root.
          </li>
          <li>
            <strong>Manual document</strong> — signed authorization letter PDF,
            uploaded and reviewed by an admin for larger customers.
          </li>
          <li>
            <strong>Enterprise contract</strong> — MSA/DPA scope reference,
            unlocked by internal ops.
          </li>
        </ul>
        <h2>Authorization artifacts</h2>
        <p>
          A verification proves you control the host. An{" "}
          <strong>authorization artifact</strong> proves someone with authority
          signed off on active testing. Rows live in{" "}
          <Code>authorization_artifacts</Code> with{" "}
          <Code>signed_by_name</Code>, <Code>signed_by_email</Code>,{" "}
          <Code>valid_until</Code>, and a SHA-256 of the stored PDF. Active
          scans against enterprise plans require a non-expired artifact.
        </p>
        <h2>Verification lifecycle</h2>
        <Pre>{`pending  ── worker check succeeds ──▶  verified
verified ── time.now > expires_at ──▶  expired
verified ── customer revokes ──────▶  revoked
pending  ── 3 failures in 24h ─────▶  failed`}</Pre>
        <p>
          <strong>Every scan_run row snapshots</strong> the verification id and
          its status at launch time. If the customer later revokes ownership,
          the historical scan record still explains why we were authorized to
          run.
        </p>
      </>
    ),
  },
  {
    slug: "schema",
    number: "4",
    title: "Database schema (Postgres / Neon)",
    eyebrow: "The tables the whole product hangs off",
    summary:
      "One relational store, all tenanted by organization_id, with careful separation between hot operational tables and evidence blobs (which live in object storage with only metadata in Postgres).",
    body: (
      <>
        <h2>Table map</h2>
        <p>
          The full Drizzle schema for these tables lives in{" "}
          <Code>src/db/schema.ts</Code> and drives the live dashboard. Highlights:
        </p>
        <table>
          <thead>
            <tr>
              <th>Table</th>
              <th>Purpose</th>
              <th>Key ownership</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><Code>organizations</Code></td><td>Tenant root</td><td>self</td></tr>
            <tr><td><Code>users</Code>, <Code>memberships</Code>, <Code>invitations</Code></td><td>Identity + org join</td><td><Code>organization_id</Code> on memberships/invitations</td></tr>
            <tr><td><Code>targets</Code></td><td>What we scan</td><td><Code>organization_id</Code></td></tr>
            <tr><td><Code>target_verifications</Code>, <Code>authorization_artifacts</Code></td><td>Proof of consent</td><td><Code>organization_id</Code>, <Code>target_id</Code></td></tr>
            <tr><td><Code>scopes</Code>, <Code>scope_rules</Code></td><td>What&apos;s in bounds</td><td><Code>organization_id</Code>, <Code>target_id</Code></td></tr>
            <tr><td><Code>scan_profiles</Code>, <Code>auth_profiles</Code></td><td>How to scan / auth material pointer</td><td><Code>organization_id</Code></td></tr>
            <tr><td><Code>scan_runs</Code>, <Code>scan_stage_runs</Code>, <Code>scan_jobs</Code></td><td>Execution rows + queue</td><td><Code>organization_id</Code></td></tr>
            <tr><td><Code>crawler_sessions</Code>, <Code>discovered_routes</Code></td><td>Discovery output</td><td>via <Code>scan_run_id</Code></td></tr>
            <tr><td><Code>findings</Code>, <Code>finding_instances</Code>, <Code>finding_evidence</Code></td><td>Normalized results + provenance + evidence pointers</td><td><Code>organization_id</Code> on <Code>findings</Code></td></tr>
            <tr><td><Code>finding_comments</Code>, <Code>finding_state_history</Code></td><td>Workflow</td><td>via <Code>finding_id</Code></td></tr>
            <tr><td><Code>reports</Code></td><td>Assembled report DTOs</td><td><Code>organization_id</Code></td></tr>
            <tr><td><Code>audit_logs</Code></td><td>Immutable event log</td><td><Code>organization_id</Code></td></tr>
            <tr><td><Code>webhooks</Code>, <Code>usage_counters</Code></td><td>Integrations + billing</td><td><Code>organization_id</Code></td></tr>
          </tbody>
        </table>
        <h2>Extensions</h2>
        <ul>
          <li><Code>pgcrypto</Code> — UUID generation, digest for evidence hashes</li>
          <li><Code>citext</Code> — case-insensitive email columns</li>
          <li><Code>pg_trgm</Code> — trigram indexes for finding title search</li>
        </ul>
        <h2>Partitioning</h2>
        <p>
          <Code>audit_logs</Code> and <Code>finding_instances</Code> are the two
          tables that grow unboundedly. Partition both by{" "}
          <Code>created_at</Code> RANGE monthly. Old partitions detach + archive
          to R2 as Parquet after N months per plan.
        </p>
        <h2>Evidence separation</h2>
        <p>
          <Code>finding_evidence</Code> holds pointer + hash + content-type +
          size + <Code>redacted</Code> boolean. The actual bytes live in R2 at{" "}
          <Code>{"evidence/{org}/{run}/{instance}/{sha256}"}</Code>. This keeps
          Postgres small and cheap.
        </p>
        <h2>Example DDL for findings</h2>
        <Pre>{`create table findings (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id) on delete cascade,
  target_id         uuid not null references targets(id)       on delete cascade,
  fingerprint       text not null,
  title             text not null,
  summary           text not null,
  category          text not null,
  wstg_id           text,
  cwe               text,
  severity          severity  not null,
  confidence        confidence not null,
  cvss              text,
  state             finding_state not null default 'new',
  assigned_to_user_id uuid references users(id),
  first_seen_run_id uuid references scan_runs(id),
  last_seen_run_id  uuid references scan_runs(id),
  first_seen_at     timestamptz not null default now(),
  last_seen_at      timestamptz not null default now(),
  remediation       text,
  "references"      jsonb not null default '[]'::jsonb,
  duplicate_of_id   uuid,
  unique (organization_id, fingerprint)
);
create index findings_state_sev_idx on findings(state, severity);
create index findings_target_idx    on findings(target_id);`}</Pre>
      </>
    ),
  },
  {
    slug: "tenancy",
    number: "5",
    title: "Multi-tenancy strategy",
    eyebrow: "Defense in depth: app filter + RLS + connection role",
    summary:
      "Every row is stamped with organization_id. Application code always filters. Postgres RLS is on as a second wall. Workers connect with a role that can't bypass RLS. Three independent failures required for a leak.",
    body: (
      <>
        <h2>Layer 1 — application</h2>
        <p>
          Every DB-touching function takes a <Code>session</Code> and validates
          that the object&apos;s <Code>organization_id</Code> matches the
          session&apos;s active org. There is no &ldquo;raw <Code>db</Code>&rdquo; usage in
          product code — all reads/writes go through the{" "}
          <Code>packages/db/scoped.ts</Code> helper.
        </p>
        <h2>Layer 2 — Postgres RLS</h2>
        <Pre>{`alter table findings enable row level security;

create policy findings_tenant_isolation on findings
  using (organization_id = current_setting('app.current_org', true)::uuid);

-- API handlers set:
--   SELECT set_config('app.current_org', $1, true);
-- before running the query. If the setting is missing, RLS returns 0 rows.`}</Pre>
        <h2>Layer 3 — DB roles</h2>
        <ul>
          <li><Code>app_web</Code> — used by Vercel; can read/write tenant tables, cannot bypass RLS, cannot see <Code>auth_profiles.secret_ref</Code> raw.</li>
          <li><Code>app_worker</Code> — used by workers; same as app_web plus can INSERT to <Code>finding_instances</Code>, <Code>discovered_routes</Code>, evidence metadata.</li>
          <li><Code>app_admin</Code> — used only by migrations + ops runbooks; can bypass RLS, requires MFA-guarded jump host.</li>
        </ul>
        <h2>Layer 4 — audit tripwires</h2>
        <p>
          A trigger on <Code>findings</Code> fires an alert if a row is read
          with <Code>{"current_setting('app.current_org')"}</Code> null. This has
          never fired in normal operation; if it fires we page.
        </p>
      </>
    ),
  },
  {
    slug: "repo",
    number: "6",
    title: "Repo / folder structure",
    eyebrow: "A monorepo shape that keeps workers out of Vercel",
    summary:
      "pnpm workspaces. apps/web ships to Vercel. services/* ship to Fly. packages/* are the shared kernel. The build enforces that apps/web cannot import from services/*.",
    body: (
      <>
        <Pre>{`sentinel/
├─ apps/
│  └─ web/                     # Next.js on Vercel — control plane + UI
│     ├─ app/                  # App Router pages + route handlers
│     ├─ components/
│     └─ next.config.ts
├─ packages/
│  ├─ db/                      # Drizzle schema, migrations, scoped query helpers
│  ├─ contracts/               # Zod schemas + shared TS types (imported by web AND workers)
│  ├─ auth/                    # Session, RBAC, MFA, invitation tokens
│  ├─ policy-engine/           # decidePolicy(), checkScope() — pure functions
│  ├─ findings/                # fingerprint(), normalizeGroup(), dedup
│  ├─ reporting/               # ReportDTO assembly, PDF HTML template
│  ├─ signed-claims/           # HMAC-signed job claims for worker auth
│  └─ observability/           # OTel init, redacting logger, metric helpers
├─ services/
│  ├─ orchestrator/            # Long-running scheduler; owns scan_run lifecycle
│  ├─ worker-crawler/          # Node + Playwright; HTTP + headless crawl
│  ├─ worker-passive/          # Passive analyzers (headers, cookies, mixed content, fp)
│  ├─ worker-active/           # Safe active probers (reflected XSS, SQLi indicator, etc.)
│  ├─ worker-normalizer/       # Ingests raw scanner output → NormalizedFinding
│  ├─ worker-reporter/         # Assembles ReportDTO + renders PDF
│  ├─ adapter-zap/             # Wraps ZAP CLI; parses JSON report
│  ├─ adapter-nuclei/          # Wraps Nuclei; loads per-org template allowlist
│  └─ adapter-tls/             # Wraps testssl.sh / sslyze
├─ infra/
│  ├─ terraform/               # Neon, Fly apps, R2 buckets, KMS keys, NAT egress
│  └─ fly/                     # fly.toml per worker service
├─ scripts/
│  ├─ seed.ts
│  ├─ rls-check.ts             # Boot-time test that RLS blocks cross-tenant reads
│  └─ kill-scan.ts             # Ops kill-switch CLI
└─ tests/
   ├─ integration/
   ├─ tenancy/
   └─ policy/`}</Pre>
        <h2>Import rules (enforced by ESLint)</h2>
        <ul>
          <li><Code>apps/web</Code> may import <Code>packages/*</Code> but NOT <Code>services/*</Code>.</li>
          <li><Code>services/*</Code> may import <Code>packages/*</Code> and other <Code>services/*</Code>.</li>
          <li><Code>packages/*</Code> may import other <Code>packages/*</Code> but never <Code>apps/*</Code> or <Code>services/*</Code>.</li>
          <li><Code>packages/policy-engine</Code> and <Code>packages/findings</Code> are pure — no I/O, no DB, no fetch. This is what lets us unit-test the security-critical paths thoroughly.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "queue",
    number: "7",
    title: "Queue & worker model",
    eyebrow: "Postgres-backed jobs with signed claims",
    summary:
      "Primary: a scan_jobs table with SKIP LOCKED leasing. Fallback: Redis + BullMQ. Every job carries an HMAC-signed claim so a compromised worker can't spoof jobs for other tenants.",
    body: (
      <>
        <h2>Why Postgres-first</h2>
        <p>
          Neon is already there, transactionally safe, and gives us free audit
          history. The <Code>scan_jobs</Code> table is our queue. Workers claim
          with:
        </p>
        <Pre>{`-- Atomic claim with 60s lease
update scan_jobs
   set status='leased',
       leased_by=$worker_id,
       leased_until = now() + interval '60 seconds',
       attempts = attempts + 1,
       updated_at = now()
 where id = (
   select id from scan_jobs
    where status='queued'
      and (leased_until is null or leased_until < now())
    order by priority asc, created_at asc
    for update skip locked
    limit 1
 )
returning *;`}</Pre>
        <p>
          Heartbeat every 20s while running (bumps <Code>leased_until</Code>).
          A dead worker&apos;s lease naturally expires and another worker picks up.
        </p>
        <h2>Idempotency</h2>
        <p>
          Each job has an <Code>idempotency_key</Code> unique per scan_run +
          logical step (e.g.{" "}
          <Code>{"scan:{run}:crawl:page:{sha1(url)}"}</Code>). Duplicate enqueue
          is a no-op. Adapters MUST tolerate being re-run.
        </p>
        <h2>Signed job claims</h2>
        <p>
          The orchestrator signs the payload with an HMAC key that only workers
          in that pool hold. Workers verify signature + expiry + org match{" "}
          <em>before</em> touching secrets. Prevents a rogue worker from
          fabricating a job for another tenant.
        </p>
        <h2>Cancellation</h2>
        <p>
          Cancel writes <Code>{"scan_runs.status='cancelled'"}</Code> and inserts a
          cancellation event. Workers poll their run status every N seconds
          (cheap, indexed) and abort at the next safe checkpoint. The HTTP
          wrapper is the primary checkpoint — every outbound request re-checks
          run status.
        </p>
        <h2>Kill switch</h2>
        <p>
          Ops CLI: <Code>pnpm kill-scan --run &lt;id&gt; --reason &lt;text&gt;</Code>.
          Sets status <Code>killed</Code>, emits a Redis pub-sub message,
          workers abort within 1s, records to audit log.
        </p>
        <h2>Fallback: BullMQ</h2>
        <p>
          If throughput exceeds ~500 jobs/sec sustained, migrate hot job kinds
          to BullMQ on Upstash Redis. Keep the audit-critical
          <Code>scan_runs</Code> ledger in Postgres either way.
        </p>
      </>
    ),
  },
  {
    slug: "pipeline",
    number: "8",
    title: "Scan pipeline (staged)",
    eyebrow: "16 stages, each with a contract",
    summary:
      "Every stage has a defined input, output, worker, retry policy, and cancellation point. Progress and partial failure are first-class. A scan can be resumed from the last completed stage.",
    body: (
      <>
        <ol className="list-decimal pl-5 space-y-2 text-slate-300">
          <li><strong>policy_preflight</strong> — pure function on Vercel. Denies invalid launches synchronously. Emits <Code>PolicyDecision</Code> onto <Code>scan_runs.policy_decision</Code>.</li>
          <li><strong>target_resolution</strong> — worker resolves DNS on 3 resolvers, re-checks that IP is not private, snapshots resolved IPs onto run.</li>
          <li><strong>scope_compilation</strong> — <Code>compileScope(rules)</Code> → <Code>CompiledScope</Code>, snapshotted onto run.</li>
          <li><strong>auth_prepare</strong> — decrypts auth material from KMS into worker RAM; runs login script if configured; captures cookies.</li>
          <li><strong>crawl_discovery</strong> — HTTP crawler + headless browser crawler + sitemap/robots + OpenAPI import → <Code>discovered_routes</Code>.</li>
          <li><strong>passive</strong> — fans out over hosts and pages: headers, cookies, TLS surface, mixed content, tech fingerprint.</li>
          <li><strong>active_plan</strong> — picks concrete probes per discovered route/param, budgeted against <Code>requestBudget</Code>.</li>
          <li><strong>active_execute</strong> — rate-limited safe probes only.</li>
          <li><strong>adapter_collect</strong> — parallel adapter runs (ZAP baseline, Nuclei with allowlisted templates, TLS scanner).</li>
          <li><strong>normalize</strong> — every raw finding → <Code>NormalizedFinding</Code> with fingerprint.</li>
          <li><strong>deduplicate</strong> — group by fingerprint, merge provenance + evidence.</li>
          <li><strong>score</strong> — final severity/confidence adjustment, CVSS assembly if configured.</li>
          <li><strong>persist</strong> — upsert into <Code>findings</Code> by <Code>(org, fingerprint)</Code>, insert <Code>finding_instances</Code>, evidence metadata.</li>
          <li><strong>report_assemble</strong> — build <Code>ReportDTO</Code>, insert into <Code>reports</Code>.</li>
          <li><strong>notify</strong> — fire webhooks, email digest, in-app notifications.</li>
          <li><strong>retest_compare</strong> — if a prior run exists, compute diff (new / regressed / resolved) and attach to the report.</li>
        </ol>
        <h2>Per-stage contract shape</h2>
        <Pre>{`interface StageContract<In, Out> {
  name: string;
  worker: "orchestrator" | "crawler" | "passive" | "active" | "normalizer" | "reporter";
  timeoutMs: number;
  maxRetries: number;
  isIdempotent: true;         // always true; re-runs are safe
  run(input: In, ctx: StageCtx): Promise<Out>;
  onCancel(ctx: StageCtx): Promise<void>;
}`}</Pre>
        <h2>Progress</h2>
        <p>
          Progress is stored as <Code>scan_runs.progress</Code> (0–100), derived
          from a weighted sum of stage completion. UI subscribes to a
          Server-Sent-Events endpoint that tails an in-memory bus fed from
          worker heartbeats.
        </p>
        <h2>Partial failure</h2>
        <p>
          A stage can return <Code>succeeded_with_warnings</Code> with a
          non-fatal error list on <Code>scan_stage_runs.result</Code>. E.g. one
          adapter fails: the run still completes but the report flags &ldquo;ZAP
          adapter returned partial results&rdquo;.
        </p>
      </>
    ),
  },
  {
    slug: "crawler",
    number: "9",
    title: "Crawler design",
    eyebrow: "HTTP + headless browser, both scope-checked",
    summary:
      "Two engines cooperate: a fast HTTP crawler for static routes, and a Playwright/Chromium crawler for SPAs. Both go through the shared HTTP wrapper. Both write into discovered_routes with dedup.",
    body: (
      <>
        <h2>Discovery sources</h2>
        <ul>
          <li><Code>robots.txt</Code>, <Code>sitemap.xml</Code>, <Code>/.well-known/security.txt</Code></li>
          <li>Anchor + form extraction from HTTP responses</li>
          <li>JS route inference: enumerate hash routes, react-router paths, fetch/XHR interception in the browser</li>
          <li>HAR ingestion (user uploads a HAR from their session)</li>
          <li>OpenAPI/Swagger import</li>
          <li>GraphQL introspection when explicitly allowed by scope</li>
        </ul>
        <h2>Browser engine</h2>
        <p>
          Chromium via Playwright, one context per crawl session with per-run
          user-data-dir wiped at end. Network interception hooks into every
          request: <em>every</em> URL is passed through <Code>checkScope</Code>{" "}
          <em>before</em> the browser sends it. Requests denied by scope are
          replied with 451 to the browser and logged.
        </p>
        <h2>Discovery output</h2>
        <p>
          Rows in <Code>discovered_routes</Code> uniquely keyed on{" "}
          <Code>(scan_run_id, host, method, path_template)</Code>. Path
          templates strip numeric IDs and UUIDs so <Code>/users/42</Code> and
          <Code>/users/99</Code> collapse into <Code>/users/:id</Code>. Query
          param <em>names</em> are stored; values are not.
        </p>
        <h2>Politeness</h2>
        <p>
          Global token bucket per host per run, defaulting to 4 req/s and
          configurable per scope. Randomized jitter. Respect{" "}
          <Code>Retry-After</Code>. Back off exponentially on 429/5xx.
        </p>
      </>
    ),
  },
  {
    slug: "passive",
    number: "10",
    title: "Passive testing engine",
    eyebrow: "Read-only. Enabled by default. High signal-to-noise.",
    summary:
      "Passive checks never send extra requests — they analyze responses the crawler already collected. This is the whole product on day one.",
    body: (
      <>
        <h2>Modules</h2>
        <ul>
          <li>Security headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options / frame-ancestors, Referrer-Policy, Permissions-Policy)</li>
          <li>Cookie hygiene (Secure, HttpOnly, SameSite, Path, Domain, Max-Age; session-cookie heuristics)</li>
          <li>CORS misconfiguration (reflected Origin, credentials + wildcard)</li>
          <li>Mixed content detection (HTTPS page loading HTTP subresources)</li>
          <li>Insecure link/target (<Code>target=&quot;_blank&quot;</Code> without <Code>rel=&quot;noopener&quot;</Code>)</li>
          <li>Technology fingerprint (server banner, framework markers)</li>
          <li>Exposed files heuristics from crawl (<Code>.git/HEAD</Code>, <Code>.env</Code>, <Code>backup.zip</Code>) — only if scope allows and only via already-visited URLs</li>
          <li>TLS surface observations from the crawl (protocol, cipher, cert age)</li>
        </ul>
        <h2>Signature</h2>
        <Pre>{`interface PassiveAnalyzer {
  id: string;                                // e.g. "internal.passive.headers"
  wstgIds: string[];                         // for provenance
  analyze(page: CrawledPage): RawScannerFinding[];
}`}</Pre>
        <p>
          Analyzers are pure functions on captured request/response pairs; they
          get unit-tested with fixture responses. Zero network access.
        </p>
      </>
    ),
  },
  {
    slug: "active",
    number: "11",
    title: "Active testing engine",
    eyebrow: "Safe probes only, budgeted, cancellable",
    summary:
      "Active modules send additional targeted requests to detect indicators of vulnerability. They never attempt exploitation. Every probe carries a benign marker, respects the request budget, and passes through the scope wrapper.",
    body: (
      <>
        <h2>Modules shipped</h2>
        <ul>
          <li><strong>Reflected XSS indicator</strong> — sends a per-run unique marker string, checks reflection in response body with context (HTML text vs attribute vs script). Never delivers an actual executing payload.</li>
          <li><strong>SQLi indicator</strong> — appends a single quote or timing-neutral boolean pair; classifies driver error signatures. No <Code>UNION</Code>, no data extraction.</li>
          <li><strong>Path traversal indicator</strong> — one canonical <Code>../../etc/passwd</Code> style probe, checks response for signature; does not iterate depth.</li>
          <li><strong>Open redirect</strong> — appends a marker host to redirect params, follows one hop, checks Location header.</li>
          <li><strong>HTTP method probing</strong> — OPTIONS/TRACE/PUT/DELETE existence check, no payload.</li>
          <li><strong>Auth/session weaknesses</strong> — cookie fixation observation, missing rate limit on <Code>/login</Code> (bounded 20-request probe with random invalid credentials).</li>
        </ul>
        <h2>Explicitly excluded</h2>
        <ul>
          <li>Any payload that would create/modify data (POST attacks on live endpoints without a designated staging target)</li>
          <li>Any brute-force with real usernames</li>
          <li>Any DoS / high-throughput fuzz</li>
          <li>Any post-exploit action even on positive finding</li>
        </ul>
        <h2>Confidence scoring</h2>
        <p>
          Each active module returns <Code>tentative | firm | certain</Code>{" "}
          based on multi-signal evidence (e.g. reflected XSS is <em>firm</em>{" "}
          only if the marker is reflected <em>and</em> the surrounding context
          is an executable sink; otherwise <em>tentative</em>).
        </p>
      </>
    ),
  },
  {
    slug: "auth-scan",
    number: "12",
    title: "Authenticated scanning",
    eyebrow: "The most sensitive path in the product",
    summary:
      "Auth material lives outside Postgres. Workers decrypt at job start and destroy on job end. Evidence captured from authenticated sessions is passed through a redaction pipeline before persistence.",
    body: (
      <>
        <h2>Supported modes</h2>
        <ul>
          <li>Session cookie (paste a captured cookie; scoped to a single target)</li>
          <li>Bearer token</li>
          <li>Custom header (e.g. <Code>X-Api-Key</Code>)</li>
          <li>HTTP Basic</li>
          <li>Scripted browser login — customer provides Playwright script + credentials</li>
        </ul>
        <h2>Storage</h2>
        <p>
          Postgres holds only <Code>auth_profiles.secret_ref</Code>, a pointer
          like <Code>{"kms://sentinel-secrets/{org}/{profile}/v3"}</Code>. The
          material is envelope-encrypted with a per-org data key wrapped by a
          per-tenant KMS master key. Rotation increments <Code>v3 → v4</Code>{" "}
          and old versions are destroyed after grace.
        </p>
        <h2>Delivery to workers</h2>
        <Pre>{`// Orchestrator, on job launch:
const materialCipher = await secretsStore.fetch(profile.secret_ref);
const materialKey    = await kms.decryptDataKey(materialCipher.wrappedKey);
const payload = signJobClaim({
  jobKind: "active.reflected_xss",
  runId, orgId, targetId,
  scope, profile,
  authRef: profile.secret_ref,     // never the plaintext
  wrappedKey: materialCipher.wrappedKey,
});

// Worker, on lease:
verifyClaim(payload);
const material = await workerKms.unwrap(payload.wrappedKey);
try {
  await runJob(material);
} finally {
  wipe(material);                  // Buffer.fill(0) + release
}`}</Pre>
        <h2>Redaction of captured evidence</h2>
        <p>
          The evidence pipeline runs every request/response through a redactor
          before hashing/persisting:
        </p>
        <ul>
          <li>Strips headers on a denylist (<Code>Authorization</Code>, <Code>Cookie</Code>, <Code>Set-Cookie</Code>, <Code>X-Api-Key</Code>, plus per-profile custom names)</li>
          <li>Replaces the auth material verbatim (if seen anywhere in body) with <Code>[REDACTED:auth]</Code></li>
          <li>Applies configurable PII regex (email, phone, SSN, credit card via Luhn)</li>
          <li>Sets <Code>finding_evidence.redacted = true</Code>; a raw evidence bit only exists if the customer explicitly opts in per-target</li>
        </ul>
        <h2>Never</h2>
        <ul>
          <li>Log request/response bodies at INFO or above from any authenticated path</li>
          <li>Include auth material in error messages</li>
          <li>Include auth material in exported reports</li>
          <li>Reuse an auth profile across organizations</li>
        </ul>
      </>
    ),
  },
  {
    slug: "adapters",
    number: "13",
    title: "Scanner adapter architecture",
    eyebrow: "One shape, many external tools",
    summary:
      "Every external tool (ZAP, Nuclei, sqlmap safe-mode, TLS scanners) implements a small interface. The adapter runs in an isolated worker with its scope-checked HTTP wrapper, and returns raw findings the normalizer consumes.",
    body: (
      <>
        <h2>Interface</h2>
        <Pre>{`export interface ScannerAdapter<Config = unknown> {
  id: string;                     // e.g. "adapter.zap"
  displayName: string;
  supports(kind: TargetKind): boolean;

  /** Validate config against org policy before running. */
  validate(config: Config, ctx: AdapterCtx): AdapterValidation;

  /** Actually run. Must respect ctx.scope + ctx.cancellationSignal. */
  run(config: Config, ctx: AdapterCtx): AsyncIterable<RawScannerFinding>;
}

interface AdapterCtx {
  runId: string;
  organizationId: string;
  targetId: string;
  scope: CompiledScope;
  profile: ScanProfileConfig;
  http: ScopeCheckedHttp;         // ALL outbound must use this
  cancellationSignal: AbortSignal;
  emitProgress(pct: number): void;
}`}</Pre>
        <h2>Adapter matrix</h2>
        <table>
          <thead>
            <tr>
              <th>Adapter</th>
              <th>Underlying tool</th>
              <th>Mode</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><Code>adapter.zap</Code></td><td>OWASP ZAP baseline</td><td>passive + active</td><td>Runs headless ZAP with our proxy config; ingests JSON report</td></tr>
            <tr><td><Code>adapter.nuclei</Code></td><td>Nuclei</td><td>active</td><td>Template allowlist per plan; blocks intrusive tags by default</td></tr>
            <tr><td><Code>adapter.tls</Code></td><td>sslyze / testssl.sh</td><td>passive</td><td>TLS surface + cert chain</td></tr>
            <tr><td><Code>adapter.discovery</Code></td><td>ffuf-style content discovery</td><td>active</td><td>Rate-capped hard; wordlist chosen by profile</td></tr>
            <tr><td><Code>adapter.sqlmap</Code></td><td>sqlmap</td><td>opt-in only</td><td><Code>--level 1 --risk 1 --technique BEU</Code>; requires enterprise plan + LOA on file</td></tr>
          </tbody>
        </table>
        <h2>Isolation</h2>
        <p>
          Each adapter runs as its own service (<Code>services/adapter-*</Code>)
          in a container with:
        </p>
        <ul>
          <li>No inbound ports</li>
          <li>Egress restricted to a per-run allowlist of resolved IPs (from the target_resolution stage)</li>
          <li>No access to Postgres — reports back only via the orchestrator&apos;s signed callback</li>
        </ul>
      </>
    ),
  },
  {
    slug: "normalization",
    number: "14",
    title: "Finding normalization & deduplication",
    eyebrow: "One finding, many provenances",
    summary:
      "A stable fingerprint collapses ZAP + Nuclei + internal duplicates into one Finding, with each source preserved as a FindingInstance. Lifecycle tracking falls out of this for free.",
    body: (
      <>
        <h2>Fingerprint recipe</h2>
        <p>See <Code>src/domain/fingerprint.ts</Code> in this repo. The SHA-256 is computed over:</p>
        <Pre>{`category | wstgId | cwe | lowercased host | uppercased method | normalized path | lowercased param name`}</Pre>
        <p>Explicitly excluded from the fingerprint:</p>
        <ul>
          <li>Query values, body values, session tokens (any user-scoped bytes)</li>
          <li>Scanner-assigned rule IDs</li>
          <li>Timestamps</li>
          <li>Response bodies</li>
        </ul>
        <h2>Path normalization</h2>
        <p>
          Numeric segments become <Code>:id</Code>; UUID segments become{" "}
          <Code>:uuid</Code>. Everything is lowercased. Trailing slash is
          stripped. This is what makes <Code>/orders/42</Code> and{" "}
          <Code>/orders/99</Code> the same finding.
        </p>
        <h2>Merge rules when grouping</h2>
        <ul>
          <li>Severity: max across sources</li>
          <li>Confidence: max across sources</li>
          <li>Provenance: union, sorted</li>
          <li>References: union, sorted, dedup</li>
          <li>Title/summary: taken from highest-confidence source; ties broken by preferred provenance order (<Code>internal.* &gt; adapter.zap &gt; adapter.nuclei</Code>)</li>
        </ul>
        <h2>Lifecycle from dedup</h2>
        <ul>
          <li>Upsert on <Code>(org, fingerprint)</Code> — if new, <Code>first_seen_run_id</Code> = current run.</li>
          <li>Always update <Code>last_seen_run_id</Code>, <Code>last_seen_at</Code>.</li>
          <li>After the run completes, any finding for this target whose <Code>last_seen_run_id != current run</Code> is a <strong>candidate for resolution</strong>. If the operator has enabled auto-resolve on this profile, transition <Code>new/triaged</Code> → <Code>resolved</Code>.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "api",
    number: "15",
    title: "Control-plane API design",
    eyebrow: "REST + Zod, org-scoped, versioned",
    summary:
      "REST under /api/v1. Every route validates with Zod, resolves the session, enforces org scope via withOrg, rate-limits, and audits mutating actions.",
    body: (
      <>
        <h2>Style</h2>
        <ul>
          <li><Code>/api/v1/*</Code> with explicit versioning</li>
          <li>Nouns not verbs; state transitions are <Code>POST /findings/:id/transitions</Code> with a <Code>type</Code></li>
          <li>Zod at the boundary; typed handler bodies</li>
          <li>Every mutating route writes an <Code>audit_logs</Code> row in the same transaction</li>
        </ul>
        <h2>Routes</h2>
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Path</th>
              <th>Auth</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>POST</td><td>/api/v1/auth/session</td><td>public</td><td>Email/password + MFA → session cookie</td></tr>
            <tr><td>GET</td><td>/api/v1/orgs</td><td>session</td><td>List orgs current user belongs to</td></tr>
            <tr><td>POST</td><td>/api/v1/orgs</td><td>session</td><td>Create org (creator becomes owner)</td></tr>
            <tr><td>POST</td><td>/api/v1/orgs/:org/invites</td><td>admin+</td><td>Invite user</td></tr>
            <tr><td>GET/POST</td><td>/api/v1/orgs/:org/targets</td><td>engineer+</td><td>List / create target</td></tr>
            <tr><td>POST</td><td>/api/v1/orgs/:org/targets/:t/verifications</td><td>engineer+</td><td>Start verification</td></tr>
            <tr><td>POST</td><td>/api/v1/orgs/:org/targets/:t/verifications/:v/check</td><td>engineer+</td><td>Trigger check</td></tr>
            <tr><td>PUT</td><td>/api/v1/orgs/:org/targets/:t/scope</td><td>security_lead+</td><td>Replace scope</td></tr>
            <tr><td>POST</td><td>/api/v1/orgs/:org/auth-profiles</td><td>security_lead+</td><td>Create auth profile (secrets go to KMS)</td></tr>
            <tr><td>POST</td><td>/api/v1/orgs/:org/scan-profiles</td><td>security_lead+</td><td>Create scan profile</td></tr>
            <tr><td>POST</td><td>/api/v1/orgs/:org/scans</td><td>role-gated</td><td>Launch a scan → runs policy preflight → inserts scan_run + jobs</td></tr>
            <tr><td>POST</td><td>/api/v1/orgs/:org/scans/:id/cancel</td><td>security_lead+</td><td>Cancel</td></tr>
            <tr><td>POST</td><td>/api/v1/orgs/:org/scans/:id/kill</td><td>owner/admin</td><td>Kill switch — audited hard</td></tr>
            <tr><td>GET</td><td>/api/v1/orgs/:org/scans/:id</td><td>viewer+</td><td>Scan run detail</td></tr>
            <tr><td>GET</td><td>/api/v1/orgs/:org/scans/:id/events</td><td>viewer+</td><td>SSE progress stream</td></tr>
            <tr><td>GET</td><td>/api/v1/orgs/:org/findings</td><td>viewer+</td><td>Filter/search</td></tr>
            <tr><td>POST</td><td>/api/v1/orgs/:org/findings/:id/transitions</td><td>engineer+</td><td>State change (triage/confirm/resolve/FP/accepted)</td></tr>
            <tr><td>POST</td><td>/api/v1/orgs/:org/findings/:id/comments</td><td>viewer+</td><td>Comment</td></tr>
            <tr><td>POST</td><td>/api/v1/orgs/:org/scans/:id/retest</td><td>engineer+</td><td>Launch a scoped retest</td></tr>
            <tr><td>POST</td><td>/api/v1/orgs/:org/reports</td><td>engineer+</td><td>Generate report</td></tr>
            <tr><td>GET</td><td>/api/v1/orgs/:org/audit-logs</td><td>admin+</td><td>Query audit trail</td></tr>
            <tr><td>POST/DELETE</td><td>/api/v1/orgs/:org/webhooks</td><td>admin+</td><td>Manage webhooks</td></tr>
          </tbody>
        </table>
        <h2>Rate limits</h2>
        <ul>
          <li>Read endpoints: 60 req/min per session</li>
          <li>Launch endpoints: 5 req/min per org</li>
          <li>Public auth: 10 req/min per IP, sliding window</li>
        </ul>
        <h2>Example handler skeleton</h2>
        <Pre>{`export const POST = withOrg(
  z.object({ targetId: z.string().uuid(), scanProfileId: z.string().uuid(), authProfileId: z.string().uuid().optional(), activeRequested: z.boolean().default(false) }),
  async ({ body, session, org, db, audit }) => {
    const target = await requireOrgResource(db, org.id, targets, body.targetId);
    const scope  = await loadScope(db, org.id, target.id);
    const profile = await requireOrgResource(db, org.id, scanProfiles, body.scanProfileId);

    const decision = decidePolicy({ ...ids, activeRequested: body.activeRequested }, buildPolicyContext(...));
    if (!decision.allowed) return httpError(403, "policy_denied", decision.denyCodes);

    const run = await db.transaction(async (tx) => {
      const [row] = await tx.insert(scanRuns).values({
        organizationId: org.id, targetId: target.id,
        scopeSnapshot: decision.effectiveScope,
        profileSnapshot: profile.config,
        policyDecision: decision,
        launchedByUserId: session.user.id,
        scopeId: scope.id, scanProfileId: profile.id,
      }).returning();
      await enqueueInitialJobs(tx, row);
      await audit(tx, "scan.launch", { targetType: "scan_run", targetId: row.id, payload: { active: body.activeRequested } });
      return row;
    });

    return Response.json({ scanRun: run }, { status: 201 });
  }
);`}</Pre>
      </>
    ),
  },
  {
    slug: "rbac",
    number: "16",
    title: "RBAC & secrets model",
    eyebrow: "Six roles, one permission matrix, KMS envelope for secrets",
    summary:
      "Roles are coarse; permissions are fine and derived. Secrets never sit in Postgres cleartext; the DB stores only references.",
    body: (
      <>
        <h2>Roles</h2>
        <table>
          <thead>
            <tr><th>Role</th><th>Can</th><th>Cannot</th></tr>
          </thead>
          <tbody>
            <tr><td>owner</td><td>everything, delete org, transfer</td><td>—</td></tr>
            <tr><td>admin</td><td>manage members, billing, webhooks, kill switch</td><td>delete org</td></tr>
            <tr><td>security_lead</td><td>launch active scans, manage scope & auth profiles</td><td>manage billing</td></tr>
            <tr><td>engineer</td><td>launch passive scans, triage findings, retest</td><td>launch active scans, edit scope, upload LOA</td></tr>
            <tr><td>auditor</td><td>read everything incl. audit log, export reports</td><td>launch any scan, mutate findings</td></tr>
            <tr><td>viewer</td><td>read findings, read reports</td><td>audit log, exports</td></tr>
          </tbody>
        </table>
        <h2>Permission derivation</h2>
        <p>
          A single <Code>permissions.ts</Code> table maps
          <Code>(role, action)</Code> → <Code>allow | deny</Code>. Handlers call
          <Code>can(session, &quot;scan.launch.active&quot;)</Code>. No handler
          checks a role string directly — that&apos;s an ESLint rule.
        </p>
        <h2>Secrets model</h2>
        <ul>
          <li>Per-org KMS master key.</li>
          <li>Per-secret data key, wrapped by the org master key. Stored ciphertext + wrapped data key live in R2 under <Code>{"secrets/{org}/{ref}"}</Code>.</li>
          <li>Postgres stores only the <Code>secret_ref</Code> string.</li>
          <li>Rotation: bump version, dual-write, wait for grace, delete old.</li>
          <li>Access log: every KMS decrypt writes an audit row with actor + purpose.</li>
        </ul>
      </>
    ),
  },
  {
    slug: "evidence",
    number: "17",
    title: "Evidence storage & audit logging",
    eyebrow: "Metadata in Postgres, bytes in R2, both immutable in practice",
    summary:
      "Evidence rows carry a hash + pointer; blobs are content-addressed in object storage. Audit logs are INSERT-only at the DB grant level.",
    body: (
      <>
        <h2>Evidence lifecycle</h2>
        <ol className="list-decimal pl-5 space-y-1 text-slate-300">
          <li>Worker captures raw evidence (request + response, screenshot, DOM).</li>
          <li>Redactor removes headers/values/PII per profile.</li>
          <li>Blob is written to R2 at <Code>{"evidence/{org}/{run}/{instance}/{sha256}.{ext}"}</Code> (content-addressed → free dedup).</li>
          <li><Code>finding_evidence</Code> row created with hash, size, MIME, <Code>redacted=true</Code>.</li>
          <li>UI fetches via signed URL from a Vercel API route that checks org scope first.</li>
        </ol>
        <h2>Retention</h2>
        <ul>
          <li>Free plan: 30 days evidence retention</li>
          <li>Team: 180 days</li>
          <li>Enterprise: 2 years, then Parquet archive</li>
          <li>Deletion is soft first (<Code>archived_at</Code>), hard after grace</li>
        </ul>
        <h2>Audit log immutability</h2>
        <Pre>{`grant insert, select on audit_logs to app_web, app_worker;
revoke update, delete on audit_logs from app_web, app_worker;
-- Only app_admin (jump host, MFA) can prune old partitions.`}</Pre>
        <p>
          Detached monthly partitions are exported to R2 as gzip Parquet and
          then dropped. A checksum manifest is signed and stored — regulators
          can request it.
        </p>
      </>
    ),
  },
  {
    slug: "ui",
    number: "18",
    title: "UI / dashboard information architecture",
    eyebrow: "The screens, the empty states, the actions",
    summary:
      "Sidebar-driven, table-heavy, severity-first. Every list has filter chips; every detail page has a &lsquo;why&rsquo; panel that ties back to the policy decision or the fingerprint.",
    body: (
      <>
        <h2>Top-level nav</h2>
        <ul>
          <li>Dashboard (executive rollup)</li>
          <li>Targets → Target detail → Scope builder / Verification / Auth profiles</li>
          <li>Scan profiles</li>
          <li>Scans → Scan run detail (live progress + immutable snapshots)</li>
          <li>Findings → Finding detail (evidence viewer, instances timeline)</li>
          <li>Reports</li>
          <li>Audit log</li>
          <li>Org settings → Members / Roles / Quotas / Webhooks</li>
        </ul>
        <h2>Screen recipe (applies to every screen)</h2>
        <ul>
          <li>Header with eyebrow (context), title, description, primary + secondary action</li>
          <li>Empty state that explains what to do</li>
          <li>Loading skeleton that mirrors the final layout</li>
          <li>Error state with a &ldquo;copy support token&rdquo; button (that&apos;s a request id)</li>
          <li>Permission-aware buttons (disabled with tooltip explaining why, not hidden)</li>
        </ul>
        <h2>Key UX patterns</h2>
        <ul>
          <li><strong>Severity visualization</strong> — always the same chip + always the same colors; used in tables, charts, and PDF</li>
          <li><strong>Scan progress</strong> — SSE-driven stepper matching the pipeline stages</li>
          <li><strong>Evidence viewer</strong> — tabbed panels: Request / Response / Screenshot / DOM; every panel labels what was redacted</li>
          <li><strong>Scope builder</strong> — two columns: allow / deny; wildcard preview shows resolved hosts; hostile inputs (IPs, RFC1918, wildcards that swallow the internet) are rejected with an explainer</li>
          <li><strong>Report export</strong> — one modal with tabs for JSON, CSV, PDF; PDF preview inline</li>
        </ul>
        <p>
          The <Link className="text-sky-300 hover:underline" href="/dashboard">/dashboard</Link>{" "}
          screens in this repo are the working reference for these patterns.
        </p>
      </>
    ),
  },
  {
    slug: "testing",
    number: "19",
    title: "Testing strategy",
    eyebrow: "The security-critical paths get the most coverage",
    summary:
      "Policy engine and normalization are pure — 100% branch coverage. Tenancy isolation is asserted by a boot-time integration test. Queue mechanics are property-tested for cancellation + idempotency.",
    body: (
      <>
        <h2>Layers</h2>
        <ul>
          <li><strong>Unit</strong> — Vitest. Everything in <Code>packages/policy-engine</Code>, <Code>packages/findings</Code> is 100% covered. Fuzz the fingerprint against fixture pairs.</li>
          <li><strong>Contract</strong> — Zod schemas in <Code>packages/contracts</Code> are the source of truth; workers and API share them and are cross-tested.</li>
          <li><strong>Integration</strong> — Ephemeral Postgres via Testcontainers; every migration runs, seed loads, RLS is asserted.</li>
          <li><strong>Tenancy isolation</strong> — For every table with <Code>organization_id</Code>, a test creates two orgs and asserts each side sees only its own rows via both app-scoped queries and raw RLS-enforced queries.</li>
          <li><strong>Queue</strong> — Simulated crashes mid-lease; assert the job is picked up again exactly once and completes.</li>
          <li><strong>Cancellation</strong> — Start a long-running fake job, cancel, assert termination within N ms and no further writes.</li>
          <li><strong>Adapter</strong> — Golden-file tests: canned ZAP/Nuclei JSON in, expected <Code>NormalizedFinding[]</Code> out.</li>
          <li><strong>End-to-end</strong> — Playwright against a locally-stood-up vulnerable target (OWASP juice-shop in Docker), full pipeline runs, expected findings appear.</li>
        </ul>
        <h2>Local dev</h2>
        <ul>
          <li><Code>docker compose up</Code> brings Postgres + Redis + juice-shop</li>
          <li><Code>pnpm dev</Code> starts Next.js and workers with hot reload</li>
          <li>Seed script populates realistic data (this repo ships it)</li>
        </ul>
      </>
    ),
  },
  {
    slug: "roadmap",
    number: "20",
    title: "Phased delivery roadmap",
    eyebrow: "What to build first, what to defer",
    summary:
      "Phase 1 is a passive-only scanner with verification and a beautiful findings UI. Everything else is later. Ship in weeks, not months.",
    body: (
      <>
        <h2>Phase 1 — Passive MVP (weeks 0–8)</h2>
        <ul>
          <li>Orgs, users, memberships, invitations</li>
          <li>Target CRUD + DNS TXT and HTTP-file verification</li>
          <li>Scope: allow/deny host + path + method</li>
          <li>HTTP crawler (no browser yet) with scope wrapper + rate limiting</li>
          <li>Passive analyzers: headers, cookies, mixed content, tech fingerprint</li>
          <li>Findings + fingerprint + normalizer + dashboard + basic report</li>
          <li>Audit log + kill switch</li>
          <li>1 worker service on Fly, Postgres queue, no adapters yet</li>
        </ul>
        <p><strong>Deferred:</strong> browser crawl, active checks, auth profiles, adapters, retest, webhooks.</p>

        <h2>Phase 2 — Auth + richer crawl (weeks 8–14)</h2>
        <ul>
          <li>Auth profiles (cookie, bearer, scripted browser login)</li>
          <li>KMS envelope for secrets</li>
          <li>Playwright crawler for SPAs</li>
          <li>OpenAPI import</li>
          <li>Evidence redactor + evidence viewer UI</li>
          <li>DB: <Code>auth_profiles</Code>, <Code>finding_evidence</Code></li>
        </ul>

        <h2>Phase 3 — Adapters + reporting (weeks 14–20)</h2>
        <ul>
          <li>Active engine (reflected XSS indicator, SQLi indicator, open redirect, path traversal)</li>
          <li>ZAP + Nuclei adapters with allowlisted templates</li>
          <li>TLS adapter</li>
          <li>PDF reports, CSV/JSON exports</li>
          <li>Scheduled scans</li>
        </ul>

        <h2>Phase 4 — Collaboration + retest + trends (weeks 20–28)</h2>
        <ul>
          <li>Finding comments, assignment, state history UI</li>
          <li>Retest launcher + scan diff report</li>
          <li>Trends dashboard (severity by month, MTTR)</li>
          <li>Webhooks + Slack integration</li>
        </ul>

        <h2>Phase 5 — Enterprise governance (weeks 28+)</h2>
        <ul>
          <li>SSO/SAML, SCIM</li>
          <li>Enterprise authorization artifacts + admin review workflow</li>
          <li>Per-region worker pools + data residency</li>
          <li>Full audit log export + regulator-friendly signing</li>
          <li>Opt-in sqlmap safe-mode adapter with signed LOA required</li>
        </ul>
      </>
    ),
  },
  {
    slug: "closing",
    number: "★",
    title: "Closing checklists",
    eyebrow: "The lists a founder actually needs on the wall",
    summary:
      "The 14-day starter, the top 15 mistakes, the minimum viable production architecture, and the future scaling path.",
    body: (
      <>
        <h2>Build this first in the next 14 days</h2>
        <ol className="list-decimal pl-5 space-y-1 text-slate-300">
          <li>Repo scaffold: pnpm workspaces with <Code>apps/web</Code>, <Code>packages/db</Code>, <Code>services/worker-passive</Code></li>
          <li>Neon project + Drizzle migrations for <Code>organizations</Code>, <Code>users</Code>, <Code>memberships</Code>, <Code>targets</Code>, <Code>target_verifications</Code>, <Code>scopes</Code>, <Code>scan_runs</Code>, <Code>scan_jobs</Code>, <Code>findings</Code>, <Code>finding_instances</Code>, <Code>audit_logs</Code></li>
          <li>Email + password + MFA auth; org create → owner membership in the same transaction</li>
          <li>Target create + DNS TXT verification worker</li>
          <li>Scope builder that produces a <Code>CompiledScope</Code></li>
          <li>Scope-checked HTTP wrapper with hard-blocked private/metadata ranges</li>
          <li>Postgres-backed job queue with SKIP LOCKED lease + heartbeat</li>
          <li>HTTP crawler that writes <Code>discovered_routes</Code></li>
          <li>Headers + cookies + mixed-content passive analyzers</li>
          <li>Normalizer + fingerprint (copy from <Code>src/domain/fingerprint.ts</Code>)</li>
          <li>Findings dashboard + finding detail (start from the pages in this repo)</li>
          <li>Audit log + kill switch CLI</li>
          <li>Signed-URL evidence retrieval via a Vercel route that checks org scope</li>
          <li>Integration test that a second org cannot read the first org&apos;s findings</li>
        </ol>

        <h2>Top 15 mistakes that will break this product</h2>
        <ol className="list-decimal pl-5 space-y-1 text-slate-300">
          <li>Letting <em>any</em> scan run before verification is <em>verified</em>.</li>
          <li>Doing scope checking in the crawler but not in the adapters.</li>
          <li>Trusting DNS at request time — an attacker rebinds mid-scan.</li>
          <li>Storing auth cookies in Postgres in cleartext for &ldquo;convenience&rdquo;.</li>
          <li>Logging request/response bodies from authenticated scans at INFO level.</li>
          <li>Sharing a browser context across tenants.</li>
          <li>Making the kill switch require a code deploy.</li>
          <li>Fingerprinting findings including the query values (each URL becomes a new &ldquo;finding&rdquo;, dedup dies, users hate you).</li>
          <li>Running ZAP/Nuclei on Vercel or in an AWS Lambda — long jobs die, retries corrupt state.</li>
          <li>Skipping RLS &ldquo;because the app filters&rdquo; — the day someone forgets, everyone is inside everyone.</li>
          <li>Building active checks before you have cancellation working end-to-end.</li>
          <li>Coupling report rendering to the DB — makes retesting/diffing miserable. Assemble a DTO, render the DTO.</li>
          <li>Letting users pass a wildcard scope like <Code>*</Code> or <Code>*.com</Code>.</li>
          <li>Missing egress restriction from worker VMs — one SSRF and you&apos;re inside your own metadata service.</li>
          <li>Charging by target instead of by scan — invites customers to point one &ldquo;target&rdquo; at the entire internet.</li>
        </ol>

        <h2>Minimum viable production architecture</h2>
        <ul>
          <li>1× Neon Postgres project (with branching for previews)</li>
          <li>1× Vercel project (<Code>apps/web</Code>)</li>
          <li>2× Fly Machines (auto-suspend): one <Code>orchestrator</Code>, one <Code>worker-passive</Code>. Both hold a warm pool; scale-to-zero when idle.</li>
          <li>1× Cloudflare R2 bucket for evidence + reports</li>
          <li>1× KMS key per org (AWS KMS, cheap)</li>
          <li>1× NAT with allowlisted egress in front of workers</li>
          <li>Grafana Cloud free tier for logs/metrics/traces</li>
          <li>Uptime pings on <Code>/api/health</Code> and on the Fly worker &ldquo;last-heartbeat&rdquo; endpoint</li>
        </ul>
        <p>That&apos;s roughly $80–$200/month to serve real customers with real active scanning.</p>

        <h2>Future scaling path</h2>
        <ol className="list-decimal pl-5 space-y-1 text-slate-300">
          <li>Move job queue hot path to BullMQ on Upstash Redis when Postgres queue latency P99 &gt; 1s. Keep <Code>scan_runs</Code> in Postgres as the ledger.</li>
          <li>Shard workers by region and by adapter type; pin adapters that need per-tool caches.</li>
          <li>Partition <Code>audit_logs</Code>, <Code>finding_instances</Code>, <Code>discovered_routes</Code> monthly; archive old partitions to R2 Parquet.</li>
          <li>Add a read replica in Neon for the reporting/analytics endpoints.</li>
          <li>Introduce per-org egress pools (dedicated NAT IPs) for enterprise customers so their targets can allowlist us.</li>
          <li>Add data residency: a second stack in EU with per-org steering.</li>
          <li>Extract the policy engine + fingerprint into a WASM module so a &ldquo;preview scope check&rdquo; can run in the browser without a round-trip.</li>
        </ol>
      </>
    ),
  },
];

export function findSpec(slug: string): SpecSection | undefined {
  return SPEC_SECTIONS.find((s) => s.slug === slug);
}
