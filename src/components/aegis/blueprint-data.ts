// Blueprint content data for the Aegis interactive showcase.
// Typed arrays consumed by the page sections.

export type Zone = {
  id: string;
  name: string;
  host: string;
  trust: "semi-trusted" | "trusted" | "sandboxed" | "highest";
  color: "emerald" | "amber" | "zinc" | "red";
  ingress: string;
  egress: string;
  hardening: string[];
  runs: string[];
};

export const ZONES: Zone[] = [
  {
    id: "edge",
    name: "Zone A — Vercel Edge",
    host: "Next.js 16 dashboard + control-plane API",
    trust: "semi-trusted",
    color: "amber",
    ingress: "Public HTTPS (WAF + rate limit)",
    egress: "→ Neon (pooled), → pgboss enqueue",
    hardening: ["WAF", "Rate limit", "CSRF", "NextAuth sessions", "authorize() gate"],
    runs: ["Dashboard UI", "Route Handlers (CRUD + enqueue only)", "No scan work ever"],
  },
  {
    id: "workers",
    name: "Zone B — Worker tier (Fly.io)",
    host: "Crawlers, adapters, normalizer, reporter",
    trust: "sandboxed",
    color: "red",
    ingress: "Signed job claims from pgboss only (no public ingress)",
    egress: "Only to compiled-scope-authorized hosts; RFC1918/loopback denied",
    hardening: ["Egress allowlist", "DNS pinning", "Per-job sandbox", "cgroup limits", "AbortSignal cancellation"],
    runs: ["worker-crawler (Playwright)", "worker-passive", "worker-active", "worker-normalizer", "worker-reporter", "adapter-zap/nuclei/sqlmap/ffuf/tls"],
  },
  {
    id: "neon",
    name: "Zone C — Neon Postgres",
    host: "Source of truth + pgboss queue",
    trust: "trusted",
    color: "emerald",
    ingress: "From app role (Vercel) + worker role (Fly)",
    egress: "—",
    hardening: ["RLS on every tenant table", "Least-privilege roles", "TLS", "Composite FKs", "Append-only audit"],
    runs: ["Tenancy", "Targets", "Scopes", "Scan runs", "Findings", "Audit logs", "Secrets metadata", "pgboss schema"],
  },
  {
    id: "storage",
    name: "Zone D — Object storage",
    host: "S3 / Cloudflare R2",
    trust: "trusted",
    color: "zinc",
    ingress: "Write from workers; read via presigned URLs",
    egress: "5-min presigned URLs after authorize()",
    hardening: ["Per-org prefixed keys", "Encryption at rest", "Lifecycle policies", "Redacted before write"],
    runs: ["Evidence blobs", "Report exports", "Uploaded artifacts (HAR, OpenAPI, auth docs)"],
  },
  {
    id: "kms",
    name: "Zone E — Secrets vault",
    host: "KMS + secrets-broker service",
    trust: "highest",
    color: "emerald",
    ingress: "Only worker role on demand via mTLS",
    egress: "Decrypted in-memory only",
    hardening: ["Per-org DEK (envelope encryption)", "KMS unwrap", "Audit every decrypt", "AAD binding"],
    runs: ["Auth-profile credentials at rest", "Per-org data keys (wrapped)"],
  },
];

export type Stage = {
  n: number;
  id: string;
  name: string;
  queue: string;
  worker: string;
  weight: number;
  purpose: string;
  output: string;
  skippable: boolean;
};

export const STAGES: Stage[] = [
  { n: 1, id: "policy_preflight", name: "Policy preflight", queue: "q.control", worker: "orchestrator", weight: 2, purpose: "Re-verify run is legal before any egress; defeats state drift", output: "{ ok } | { ok:false, code }", skippable: false },
  { n: 2, id: "target_resolution", name: "Target resolution", queue: "q.control", worker: "orchestrator", weight: 3, purpose: "Resolve + pin DNS for allowed hosts; SSRF validation", output: "PinnedHost[]", skippable: false },
  { n: 3, id: "scope_compilation", name: "Scope compilation", queue: "q.control", worker: "orchestrator", weight: 2, purpose: "Compile scope snapshot → fast ScopeGate; verify hash (drift)", output: "CompiledScope + ScopeGate", skippable: false },
  { n: 4, id: "auth_preparation", name: "Auth preparation", queue: "q.control", worker: "orchestrator", weight: 2, purpose: "Fetch auth profile + request secret from broker; validate expiry", output: "SecureCredential handle", skippable: true },
  { n: 5, id: "crawl", name: "Crawl", queue: "q.crawl", worker: "worker-crawler", weight: 30, purpose: "Discover hosts/routes/params; HTTP + Playwright; produce seeds", output: "CrawlResult + redacted HAR", skippable: false },
  { n: 6, id: "passive_analysis", name: "Passive analysis", queue: "q.passive", worker: "worker-passive", weight: 20, purpose: "Headers, cookies, CSP, CORS, clickjacking, mixed content, TLS surface", output: "RawFinding[] (internal-*)", skippable: false },
  { n: 7, id: "active_planning", name: "Active planning", queue: "q.active", worker: "worker-active", weight: 5, purpose: "Build test plan: route × param × module × payload, budget-capped", output: "ActiveTestPlan", skippable: true },
  { n: 8, id: "active_execution", name: "Active execution", queue: "q.active", worker: "worker-active", weight: 25, purpose: "Safe probes: XSS/SQLi/path traversal/SSRF-exposure/open redirect; scope-gated per request", output: "RawFinding[] (internal-active-*)", skippable: true },
  { n: 9, id: "adapter_collection", name: "Adapter collection", queue: "q.adapter.*", worker: "adapter-*", weight: 5, purpose: "Fan out to ZAP/Nuclei/sqlmap/ffuf/TLS; collect raw output to staging", output: "Staging refs per adapter", skippable: false },
  { n: 10, id: "normalization", name: "Normalization", queue: "q.normalize", worker: "worker-normalizer", weight: 6, purpose: "Raw → canonical FindingDraft via per-adapter normalizers", output: "FindingDraft[] grouped by fingerprint", skippable: false },
  { n: 11, id: "deduplication", name: "Deduplication", queue: "q.normalize", worker: "worker-normalizer", weight: 2, purpose: "Within-run dedup by fingerprint; cross-run upsert", output: "Finding upserts", skippable: false },
  { n: 12, id: "scoring", name: "Scoring", queue: "q.normalize", worker: "worker-normalizer", weight: 2, purpose: "Severity = max; confidence rubric (tentative/likely/confirmed)", output: "Final severity + confidence", skippable: false },
  { n: 13, id: "persistence", name: "Persistence", queue: "q.normalize", worker: "worker-normalizer", weight: 2, purpose: "Upsert findings, link evidence, denormalize counts", output: "findings + finding_evidence rows", skippable: false },
  { n: 14, id: "reporting", name: "Reporting", queue: "q.report", worker: "worker-reporter", weight: 3, purpose: "Assemble HTML + PDF + JSON + CSV with redaction pass", output: "reports + report_exports", skippable: true },
  { n: 15, id: "notification", name: "Notification", queue: "q.control", worker: "orchestrator", weight: 1, purpose: "Webhooks (SSRF-checked), in-app + email notifications", output: "notifications + webhook dispatch", skippable: true },
  { n: 16, id: "retest_comparison", name: "Retest comparison", queue: "q.normalize", worker: "worker-normalizer", weight: 2, purpose: "If parent run exists, compute added/removed/changed fingerprint diff", output: "retest_runs.diff jsonb", skippable: true },
];

export type SafetyRule = {
  id: string;
  title: string;
  rule: string;
  enforced: string;
  icon: string;
};

export const SAFETY_RULES: SafetyRule[] = [
  { id: "authz-gate", title: "Authorization gate", rule: "Active testing only on targets with authorization_status = 'authorized' AND a valid (non-expired) verification.", enforced: "State machine + preflight at enqueue + re-check at worker pull", icon: "ShieldCheck" },
  { id: "passive-default", title: "Passive by default", rule: "Passive mode is the default; active requires explicit opt-in + scope allows.", enforced: "scan_mode enum + scope.allowed_modes", icon: "ShieldHalf" },
  { id: "immutable-snapshot", title: "Per-run immutable context", rule: "Every scan_run snapshots scope, profile, authorization state + policy_version. Workers verify scope_hash.", enforced: "scan_runs jsonb columns + scope drift check", icon: "Lock" },
  { id: "kill-switch", title: "Kill switch", rule: "Org + platform emergency_stop; checked at enqueue, worker pull, and 5s heartbeat.", enforced: "organizations.emergency_stop + env flag + AbortSignal", icon: "Power" },
  { id: "rate-limit", title: "Rate + concurrency limits", rule: "Per-host RPS, per-run request budget, per-run timeout budget, per-org concurrent active cap.", enforced: "Shared RateLimiter — no adapter bypasses", icon: "Gauge" },
  { id: "quotas", title: "Per-org quotas", rule: "Monthly request budget, active-run minutes, max targets, stored findings.", enforced: "usage_counters atomic increment + preflight check", icon: "Database" },
  { id: "no-offensive", title: "No offensive capabilities", rule: "No shells, persistence, lateral movement, DoS, credential brute-force. sqlmap gated to --risk=1 --level=1.", enforced: "Hard flag allowlist on adapters", icon: "Ban" },
  { id: "audit-everything", title: "Auditable everything", rule: "Append-only audit_logs (no UPDATE/DELETE granted). Every state change + scope decision logged.", enforced: "REVOKE permissions + triggers", icon: "ScrollText" },
];

export type SchemaTable = {
  name: string;
  group: string;
  purpose: string;
  columns: { name: string; type: string; note?: string }[];
  indexes: string[];
  retention: string;
};

export const SCHEMA_TABLES: SchemaTable[] = [
  {
    name: "targets",
    group: "Targeting",
    purpose: "Tenant-scoped web target registration",
    columns: [
      { name: "id", type: "uuid PK" },
      { name: "organization_id", type: "uuid", note: "RLS" },
      { name: "primary_host", type: "citext", note: "unique per org" },
      { name: "verification_status", type: "enum", note: "unverified→verified→expired" },
      { name: "authorization_status", type: "enum", note: "none→claimed→authorized" },
      { name: "pii_sensitive", type: "boolean" },
      { name: "metadata", type: "jsonb" },
    ],
    indexes: ["(organization_id, authorization_status) WHERE deleted_at IS NULL"],
    retention: "Soft-delete (deleted_at) + 30-day grace",
  },
  {
    name: "scopes",
    group: "Targeting",
    purpose: "Versioned scope per target; one active at a time",
    columns: [
      { name: "id", type: "uuid PK" },
      { name: "target_id", type: "uuid", note: "composite FK" },
      { name: "version", type: "int" },
      { name: "is_active", type: "boolean" },
      { name: "allowed_modes", type: "scan_mode[]" },
      { name: "default_rate_limit_rps", type: "int" },
    ],
    indexes: ["UNIQUE (target_id, version)"],
    retention: "Versioned history retained",
  },
  {
    name: "scan_runs",
    group: "Execution",
    purpose: "One scan execution with immutable snapshots",
    columns: [
      { name: "id", type: "uuid PK" },
      { name: "scope_snapshot", type: "jsonb", note: "compiled + hash" },
      { name: "scan_profile_snapshot", type: "jsonb" },
      { name: "authorization_snapshot", type: "jsonb" },
      { name: "policy_version", type: "text" },
      { name: "status", type: "scan_run_status" },
      { name: "request_count", type: "bigint", note: "atomic" },
      { name: "progress", type: "int" },
    ],
    indexes: ["(org,target,created_at desc)", "UNIQUE one_active_run_per_target (partial)"],
    retention: "Retained per org policy",
  },
  {
    name: "findings",
    group: "Findings",
    purpose: "Canonical deduplicated finding per (org, fingerprint)",
    columns: [
      { name: "id", type: "uuid PK" },
      { name: "fingerprint", type: "text", note: "unique per org" },
      { name: "category", type: "finding_category", note: "WSTG-aligned" },
      { name: "wstg_id", type: "text", note: "WSTG-INPV-01" },
      { name: "severity", type: "severity" },
      { name: "confidence", type: "confidence" },
      { name: "state", type: "finding_state" },
      { name: "first_seen_at / last_seen_at", type: "timestamptz" },
    ],
    indexes: ["(org,target,severity)", "(org,state)", "GIN(title gin_trgm_ops)"],
    retention: "Lifecycle-managed; deduped across runs",
  },
  {
    name: "finding_instances",
    group: "Findings",
    purpose: "Raw per-scanner occurrence before dedup",
    columns: [
      { name: "id", type: "uuid PK" },
      { name: "finding_id", type: "uuid", note: "set by normalizer" },
      { name: "scanner", type: "text", note: "zap|nuclei|internal-*" },
      { name: "raw_payload", type: "jsonb", note: "redacted, untrusted" },
      { name: "merged_into_finding_id", type: "uuid" },
    ],
    indexes: ["(scan_run_id)", "partition by RANGE(seen_at) when large"],
    retention: "Partition monthly past 10M rows",
  },
  {
    name: "stored_secrets_metadata",
    group: "Secrets",
    purpose: "Encrypted auth credentials (envelope encryption)",
    columns: [
      { name: "id", type: "uuid PK" },
      { name: "auth_profile_id", type: "uuid", note: "composite FK" },
      { name: "encrypted_value", type: "bytea", note: "AES-256-GCM" },
      { name: "nonce", type: "bytea" },
      { name: "aad", type: "bytea", note: "org+profile ids" },
      { name: "kms_key_version", type: "int" },
      { name: "expires_at", type: "timestamptz" },
    ],
    indexes: ["(auth_profile_id)"],
    retention: "Purged 7d after rotation",
  },
  {
    name: "audit_logs",
    group: "Governance",
    purpose: "Append-only audit trail (no UPDATE/DELETE)",
    columns: [
      { name: "id", type: "uuid PK" },
      { name: "actor_type", type: "enum", note: "user|worker|system" },
      { name: "action", type: "text" },
      { name: "before / after", type: "jsonb" },
      { name: "ip", type: "inet" },
      { name: "prev_hash / hash", type: "text", note: "hash-chain (Phase 4)" },
    ],
    indexes: ["(org, created_at desc)", "partition by month"],
    retention: "1y/3y/forever per org",
  },
];

export type ApiRoute = {
  method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  path: string;
  purpose: string;
  auth: string;
};

export const API_ROUTES: ApiRoute[] = [
  { method: "POST", path: "/api/v1/orgs", purpose: "Create organization", auth: "session" },
  { method: "POST", path: "/api/v1/orgs/{orgId}/targets", purpose: "Register target", auth: "target:create" },
  { method: "POST", path: "/api/v1/orgs/{orgId}/targets/{id}/verifications", purpose: "Init ownership verification", auth: "target:verify" },
  { method: "POST", path: "/api/v1/orgs/{orgId}/targets/{id}/authorize", purpose: "Submit authorization (manual path)", auth: "target:verify" },
  { method: "PUT", path: "/api/v1/orgs/{orgId}/targets/{id}/scope", purpose: "Replace active scope (new version)", auth: "scope:edit" },
  { method: "POST", path: "/api/v1/orgs/{orgId}/scan-profiles", purpose: "Create scan profile", auth: "scan:profile:create" },
  { method: "POST", path: "/api/v1/orgs/{orgId}/targets/{id}/scans", purpose: "Launch scan (enqueue only)", auth: "scan:launch:*" },
  { method: "POST", path: "/api/v1/orgs/{orgId}/scans/{runId}/cancel", purpose: "Cancel scan", auth: "scan:cancel" },
  { method: "GET", path: "/api/v1/orgs/{orgId}/scans/{runId}/events", purpose: "SSE stage events", auth: "scan:read" },
  { method: "GET", path: "/api/v1/orgs/{orgId}/findings", purpose: "List (filter/sort/search)", auth: "finding:read" },
  { method: "POST", path: "/api/v1/orgs/{orgId}/findings/{id}/transition", purpose: "State transition", auth: "finding:transition" },
  { method: "POST", path: "/api/v1/orgs/{orgId}/reports", purpose: "Request report", auth: "report:create" },
  { method: "POST", path: "/api/v1/orgs/{orgId}/scans/{runId}/retest", purpose: "Launch retest", auth: "scan:launch:*" },
  { method: "GET", path: "/api/v1/orgs/{orgId}/audit", purpose: "Query audit log", auth: "audit:read" },
];

export type AbuseCase = {
  risk: string;
  where: string;
  mitigation: string;
  icon: string;
};

export const ABUSE_CASES: AbuseCase[] = [
  {
    risk: "Malicious user scans an unauthorized target",
    where: "Target registration, scope expansion, redirect-following",
    mitigation: "Mandatory DNS/file verification → authorization_status='authorized' before active mode. Manual approval path for enterprise. Immutable scope snapshot per run. Redirect SSRF guard.",
    icon: "Crosshair",
  },
  {
    risk: "Malicious user exfiltrates secrets / credentials",
    where: "Auth-profile endpoints, evidence endpoints, logs, reports, IDOR",
    mitigation: "Auth-profile APIs never return decrypted values (worker-only via broker). IDOR blocked by authorize() + RLS. redact() logger. Evidence redacted before storage.",
    icon: "KeyRound",
  },
  {
    risk: "Tenant attempts cross-tenant access",
    where: "Tampered org_id/target_id in API, DB query bug, leaked session",
    mitigation: "organization_id derived from session membership, never request body. RLS defense-in-depth. Composite FKs prevent cross-tenant references.",
    icon: "Users",
  },
  {
    risk: "Crafted targets trigger SSRF / internal network scans",
    where: "Target registration, wildcard scope, redirects, DNS rebinding",
    mitigation: "Forbidden IP ranges (RFC1918/loopback/link-local/metadata). DNS pinning at compile-time defeats rebinding. Per-request scope gate. Scheme allowlist (http/https only).",
    icon: "Network",
  },
  {
    risk: "Poisoned uploaded files (HAR/OpenAPI/session)",
    where: "Parser bugs (XXE, billion-laughs), stored XSS, malicious URLs",
    mitigation: "Strict Zod + JSON Schema validation. No XML. Streaming JSON with depth/size caps. Files rendered as text, never HTML. SSRF controls on extracted URLs. UUID filenames.",
    icon: "FileWarning",
  },
  {
    risk: "Worker compromise",
    where: "Scanner bug, malicious target response, dependency vuln",
    mitigation: "app_worker role cannot read KEK or other tenants' secrets. Secrets-broker (separate, mTLS, KMS-scoped) delivers per-claim secret in-memory. Egress only to scoped hosts. Ephemeral rotated workers.",
    icon: "Bug",
  },
];

export type Phase = {
  n: number;
  name: string;
  duration: string;
  scope: string;
  defers: string;
  color: "emerald" | "amber" | "red" | "zinc";
};

export const PHASES: Phase[] = [
  {
    n: 1,
    name: "MVP — Passive on verified targets",
    duration: "~6–8 weeks",
    scope: "Auth, org/target CRUD, DNS verification, scope builder, HTTP crawler, internal passive analyzers, findings + dedup, HTML/JSON reports, audit, pgboss + 4 workers, RLS.",
    defers: "Browser crawl, authed scanning, external adapters, retest, webhooks, API keys, PDF, scheduled scans.",
    color: "emerald",
  },
  {
    n: 2,
    name: "Authenticated scanning + richer crawl",
    duration: "~6 weeks",
    scope: "Auth profiles (cookie/bearer/basic/header/scripted) + KMS secrets-broker. Playwright browser crawler. Safe active engine. sqlmap (gated). Screenshots. Scheduled scans. PDF reports. Retest + diff.",
    defers: "ZAP/Nuclei/ffuf/TLS adapters, trend reports, webhooks, API keys, SSO, custom roles.",
    color: "amber",
  },
  {
    n: 3,
    name: "Adapter expansion + richer reporting",
    duration: "~6 weeks",
    scope: "Nuclei (primary DAST), ZAP (deep, enterprise), ffuf (gated), sslyze TLS. Trend reports. CSV. Webhooks (SSRF-checked). API keys. Near-dup detection (trigram). Verify-fixed workflow.",
    defers: "SSO/SCIM, custom roles, hash-chained audit, mobile, SAST.",
    color: "red",
  },
  {
    n: 4,
    name: "Collaboration + retest + trends",
    duration: "~6 weeks",
    scope: "Custom RBAC builder. SSO (SAML/OIDC via WorkOS). Hash-chained audit. Assignment workflows + SLA. Auto-retest cadence. Trend dashboards (MTTR). Issue-tracker integrations.",
    defers: "Enterprise governance pack, advanced threat-intel, mobile/SAST.",
    color: "zinc",
  },
  {
    n: 5,
    name: "Advanced governance + enterprise",
    duration: "Ongoing",
    scope: "active_deep mode (manual approval). Compliance mappings (PCI/SOC2/ISO). Executive rollups. Data residency (Neon region pin). SCIM. SOC2 attestation. Legal-hold evidence. Optional SAST + mobile modules.",
    defers: "—",
    color: "zinc",
  },
];

export type StackDecision = {
  concern: string;
  primary: string;
  backup: string;
  why: string;
};

export const STACK: StackDecision[] = [
  { concern: "Web app + API", primary: "Next.js 16 on Vercel", backup: "Self-host on Fly.io", why: "Edge-cached, fast, great DX; Route Handlers for thin control plane" },
  { concern: "Database", primary: "Neon Postgres", backup: "Supabase / RDS", why: "Branching for previews + migrations; pooled serverless access" },
  { concern: "Queue / orchestration", primary: "pgboss (Postgres-native)", backup: "Temporal", why: "Zero new infra; retries/cancel/singleton; upgrade path for complex sagas" },
  { concern: "Worker runtime", primary: "Fly.io Machines (Docker)", backup: "Railway/Render; K8s for enterprise", why: "Scale-to-zero, custom Docker for ZAP/Nuclei/Chromium, egress control" },
  { concern: "Object storage", primary: "S3 / Cloudflare R2", backup: "MinIO self-hosted", why: "Cheap durable; per-org prefixed keys; presigned URLs" },
  { concern: "Auth", primary: "NextAuth.js v4", backup: "Clerk / WorkOS for SSO", why: "Stateful session in Neon; org-scoped; upgrade to SSO later" },
  { concern: "Browser automation", primary: "Playwright", backup: "Puppeteer", why: "SPA route discovery; HAR capture; authenticated flows" },
  { concern: "Headless DAST", primary: "Nuclei + OWASP ZAP", backup: "—", why: "Nuclei lightweight primary; ZAP daemon for deep enterprise scans" },
];

export type Mistake = string;

export const TOP_MISTAKES: Mistake[] = [
  "Running scan work on Vercel — timeouts, no Chrome, no egress control.",
  "Skipping RLS because the app filters by org — one buggy query leaks every tenant.",
  "Following redirects without re-checking scope + SSRF per hop.",
  "Not pinning DNS at scope-compile time — DNS rebinding defeats forbidden-IP checks.",
  "Storing auth secrets in plaintext or with a shared DEK.",
  "Logging raw request/response without redaction — credentials leak to logs.",
  "Allowing sqlmap with default flags (--os-shell, file-write, destructive).",
  "No per-run scope snapshot — customer edits scope mid-scan, workers test out-of-scope hosts.",
  "No kill switch / cancellation propagation — runaway scans can't be stopped.",
  "Treating tentative findings as confirmed — analysts stop trusting results.",
  "Fingerprinting on title text — no dedup, pure noise.",
  "No idempotency on scan launch / report request — double-clicks create duplicates.",
  "Building a custom queue instead of pgboss/Temporal.",
  "No quota enforcement — one customer starves everyone.",
  "Shipping Phase 1 without the tenancy isolation test suite green.",
];

export const NAV_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "architecture", label: "Architecture" },
  { id: "safety", label: "Safety spine" },
  { id: "pipeline", label: "Scan pipeline" },
  { id: "security", label: "Security model" },
  { id: "schema", label: "Database" },
  { id: "api", label: "API" },
  { id: "roadmap", label: "Roadmap" },
  { id: "stack", label: "Stack" },
  { id: "pitfalls", label: "Pitfalls" },
];
