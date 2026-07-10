// ============================================================================
// Aegis — Authorized Web Application Penetration Testing Platform
// Drizzle schema (Postgres / Neon). This is a production-shaped schema for
// the platform described in the accompanying blueprint. All tables carry an
// explicit organization_id for tenant scoping. RLS is layered on top of that
// in production; the application layer also enforces org filtering.
// ============================================================================

import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const roleEnum = pgEnum("role", [
  "owner",
  "admin",
  "security_lead",
  "engineer",
  "auditor",
  "viewer",
]);

export const verificationTypeEnum = pgEnum("verification_type", [
  "dns_txt",
  "http_file",
  "meta_tag",
  "manual_document",
  "enterprise_contract",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "verified",
  "expired",
  "revoked",
  "failed",
]);

export const scopeRuleTypeEnum = pgEnum("scope_rule_type", [
  "allow_host",
  "deny_host",
  "allow_path",
  "deny_path",
  "allow_method",
  "deny_method",
  "auth_required",
  "rate_limit",
]);

export const scanProfileKindEnum = pgEnum("scan_profile_kind", [
  "passive",
  "basic_active",
  "deep_active",
  "api_focused",
  "auth_focused",
]);

export const scanRunStatusEnum = pgEnum("scan_run_status", [
  "queued",
  "policy_preflight",
  "resolving",
  "crawling",
  "passive",
  "active",
  "normalizing",
  "reporting",
  "completed",
  "failed",
  "cancelled",
  "killed",
]);

export const scanJobStatusEnum = pgEnum("scan_job_status", [
  "queued",
  "leased",
  "running",
  "succeeded",
  "failed",
  "cancelled",
  "skipped",
]);

export const severityEnum = pgEnum("severity", [
  "info",
  "low",
  "medium",
  "high",
  "critical",
]);

export const confidenceEnum = pgEnum("confidence", [
  "tentative",
  "likely",
  "confirmed",
]);

export const findingStateEnum = pgEnum("finding_state", [
  "new",
  "triaged",
  "confirmed",
  "in_remediation",
  "resolved",
  "wont_fix",
  "false_positive",
  "accepted_risk",
]);

export const authModeEnum = pgEnum("auth_mode", [
  "none",
  "cookie",
  "bearer",
  "header",
  "basic",
  "scripted_browser",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "org.create",
  "org.update",
  "member.invite",
  "member.role_change",
  "member.remove",
  "target.create",
  "target.update",
  "target.delete",
  "target.verify_start",
  "target.verify_success",
  "target.verify_fail",
  "scope.update",
  "scan.launch",
  "scan.cancel",
  "scan.kill_switch",
  "scan.completed",
  "finding.state_change",
  "finding.comment",
  "report.generate",
  "report.export",
  "auth_profile.create",
  "auth_profile.rotate",
  "auth_profile.delete",
  "policy.decision",
]);

// ---------------------------------------------------------------------------
// Identity, orgs, access
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash"), // null if SSO-only
    mfaEnabled: boolean("mfa_enabled").notNull().default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    plan: text("plan").notNull().default("free"),
    // Org-level kill switch: when true, the policy preflight blocks all new scans.
    emergencyStop: boolean("emergency_stop").notNull().default(false),
    // Per-org data-encryption key (wrapped by KMS master key). Blueprint Part 7.8.
    encryptedDek: text("encrypted_dek"),
    // Governance / safety settings, e.g. { requireMfa, allowActiveScans, maxConcurrentScans }
    settings: jsonb("settings").notNull().default(sql`'{}'::jsonb`),
    // Quotas snapshot: { monthlyScans, dailyRequests, maxTargets }
    quotas: jsonb("quotas").notNull().default(sql`'{}'::jsonb`),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("orgs_slug_uq").on(t.slug)],
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull().default("viewer"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("memberships_org_user_uq").on(t.organizationId, t.userId),
    index("memberships_user_idx").on(t.userId),
  ],
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: roleEnum("role").notNull().default("viewer"),
    tokenHash: text("token_hash").notNull(),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("invitations_org_idx").on(t.organizationId),
    uniqueIndex("invitations_token_uq").on(t.tokenHash),
  ],
);

// ---------------------------------------------------------------------------
// Targets, verification, scope
// ---------------------------------------------------------------------------

export const targets = pgTable(
  "targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    primaryHost: text("primary_host").notNull(), // e.g. "app.example.com"
    kind: text("kind").notNull().default("web_app"), // web_app | api | spa | mixed
    baseUrl: text("base_url").notNull(), // canonical origin, e.g. "https://app.example.com"
    description: text("description"),
    activeScansEnabled: boolean("active_scans_enabled")
      .notNull()
      .default(false),
    createdByUserId: uuid("created_by_user_id").references(() => users.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("targets_org_idx").on(t.organizationId),
    uniqueIndex("targets_org_host_uq").on(t.organizationId, t.primaryHost),
  ],
);

export const targetVerifications = pgTable(
  "target_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    targetId: uuid("target_id")
      .notNull()
      .references(() => targets.id, { onDelete: "cascade" }),
    type: verificationTypeEnum("type").notNull(),
    status: verificationStatusEnum("status").notNull().default("pending"),
    challenge: text("challenge").notNull(), // e.g. "aegis-verify=abcd1234"
    evidence: jsonb("evidence").notNull().default(sql`'{}'::jsonb`),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("verifications_target_idx").on(t.targetId),
    index("verifications_org_status_idx").on(t.organizationId, t.status),
  ],
);

export const authorizationArtifacts = pgTable(
  "authorization_artifacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    targetId: uuid("target_id")
      .notNull()
      .references(() => targets.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // "letter_of_authorization" | "written_consent" | "msa_addendum"
    storageKey: text("storage_key").notNull(), // pointer to object storage
    sha256: text("sha256").notNull(),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id),
    signedByName: text("signed_by_name"),
    signedByEmail: text("signed_by_email"),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("auth_artifacts_target_idx").on(t.targetId)],
);

export const scopes = pgTable(
  "scopes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    targetId: uuid("target_id")
      .notNull()
      .references(() => targets.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    // Compiled scope (denormalized for fast worker read) — mirrors scope_rules
    compiled: jsonb("compiled").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("scopes_target_idx").on(t.targetId),
    uniqueIndex("scopes_target_name_uq").on(t.targetId, t.name),
  ],
);

export const scopeRules = pgTable(
  "scope_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scopeId: uuid("scope_id")
      .notNull()
      .references(() => scopes.id, { onDelete: "cascade" }),
    type: scopeRuleTypeEnum("type").notNull(),
    pattern: text("pattern").notNull(), // host glob, path regex, method literal, or "N req/s"
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("scope_rules_scope_idx").on(t.scopeId)],
);

// ---------------------------------------------------------------------------
// Scan profiles, runs, jobs, stages
// ---------------------------------------------------------------------------

export const scanProfiles = pgTable(
  "scan_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: scanProfileKindEnum("kind").notNull(),
    // { requestBudget, timeoutMs, maxDepth, maxPages, headers, modules: {...} }
    config: jsonb("config").notNull().default(sql`'{}'::jsonb`),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("scan_profiles_org_idx").on(t.organizationId),
    uniqueIndex("scan_profiles_org_name_uq").on(t.organizationId, t.name),
  ],
);

export const authProfiles = pgTable(
  "auth_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    targetId: uuid("target_id").references(() => targets.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    mode: authModeEnum("mode").notNull(),
    // Non-secret hints only, e.g. login URL, form selectors, header names
    publicConfig: jsonb("public_config").notNull().default(sql`'{}'::jsonb`),
    // Pointer to KMS-encrypted material stored outside the primary DB
    secretRef: text("secret_ref").notNull(),
    rotatesAt: timestamp("rotates_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("auth_profiles_org_idx").on(t.organizationId),
    index("auth_profiles_target_idx").on(t.targetId),
  ],
);

export const scanRuns = pgTable(
  "scan_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    targetId: uuid("target_id")
      .notNull()
      .references(() => targets.id, { onDelete: "cascade" }),
    scopeId: uuid("scope_id")
      .notNull()
      .references(() => scopes.id),
    scanProfileId: uuid("scan_profile_id")
      .notNull()
      .references(() => scanProfiles.id),
    authProfileId: uuid("auth_profile_id").references(() => authProfiles.id),
    launchedByUserId: uuid("launched_by_user_id").references(() => users.id),
    status: scanRunStatusEnum("status").notNull().default("queued"),
    // Immutable snapshot captured at launch — critical for auditability
    scopeSnapshot: jsonb("scope_snapshot").notNull(),
    profileSnapshot: jsonb("profile_snapshot").notNull(),
    policyDecision: jsonb("policy_decision").notNull(),
    // SHA-256 of the compiled scope. Workers re-verify and abort on scope drift.
    scopeHash: text("scope_hash").notNull(),
    // Policy-engine version that authorized this run; stale runs are rejected.
    policyVersion: text("policy_version").notNull(),
    progress: integer("progress").notNull().default(0), // 0..100
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    error: text("error"),
    stats: jsonb("stats").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("scan_runs_org_created_idx").on(t.organizationId, t.createdAt),
    index("scan_runs_target_idx").on(t.targetId),
    index("scan_runs_status_idx").on(t.status),
    // Partial unique index: at most one non-terminal run per target at a time.
    // Blueprint Part 8.7 — guards against duplicate concurrent active scans.
    uniqueIndex("one_active_run_per_target")
      .on(t.targetId)
      .where(
        sql`status IN ('queued','policy_preflight','resolving','crawling','passive','active','normalizing','reporting')`,
      ),
  ],
);

export const scanStageRuns = pgTable(
  "scan_stage_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scanRunId: uuid("scan_run_id")
      .notNull()
      .references(() => scanRuns.id, { onDelete: "cascade" }),
    stage: text("stage").notNull(), // "policy_preflight" | "crawl" | "passive" | ...
    status: scanJobStatusEnum("status").notNull().default("queued"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    result: jsonb("result").notNull().default(sql`'{}'::jsonb`),
  },
  (t) => [
    index("stage_runs_run_idx").on(t.scanRunId),
    uniqueIndex("stage_runs_run_stage_uq").on(t.scanRunId, t.stage),
  ],
);

export const scanJobs = pgTable(
  "scan_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scanRunId: uuid("scan_run_id")
      .notNull()
      .references(() => scanRuns.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // "crawl.page" | "passive.headers" | "adapter.zap" | ...
    status: scanJobStatusEnum("status").notNull().default("queued"),
    priority: integer("priority").notNull().default(100),
    // Signed HMAC claim verified by workers before acting. Blueprint Part 7.7.
    claimToken: text("claim_token").notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    leasedUntil: timestamp("leased_until", { withTimezone: true }),
    leasedBy: text("leased_by"),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    result: jsonb("result").notNull().default(sql`'{}'::jsonb`),
    error: text("error"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("scan_jobs_run_idx").on(t.scanRunId),
    index("scan_jobs_status_leased_idx").on(t.status, t.leasedUntil),
    uniqueIndex("scan_jobs_idem_uq").on(t.idempotencyKey),
  ],
);

// ---------------------------------------------------------------------------
// Discovery / crawl results
// ---------------------------------------------------------------------------

export const crawlerSessions = pgTable(
  "crawler_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scanRunId: uuid("scan_run_id")
      .notNull()
      .references(() => scanRuns.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // "http" | "browser" | "openapi_import"
    pagesVisited: integer("pages_visited").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    stats: jsonb("stats").notNull().default(sql`'{}'::jsonb`),
  },
  (t) => [index("crawler_sessions_run_idx").on(t.scanRunId)],
);

export const discoveredRoutes = pgTable(
  "discovered_routes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scanRunId: uuid("scan_run_id")
      .notNull()
      .references(() => scanRuns.id, { onDelete: "cascade" }),
    host: text("host").notNull(),
    method: text("method").notNull(),
    path: text("path").notNull(),
    statusCode: integer("status_code"),
    contentType: text("content_type"),
    parametersJson: jsonb("parameters_json")
      .notNull()
      .default(sql`'[]'::jsonb`),
    requiresAuth: boolean("requires_auth").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("discovered_routes_run_idx").on(t.scanRunId),
    uniqueIndex("discovered_routes_run_hmp_uq").on(
      t.scanRunId,
      t.host,
      t.method,
      t.path,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------

export const findings = pgTable(
  "findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    targetId: uuid("target_id")
      .notNull()
      .references(() => targets.id, { onDelete: "cascade" }),
    // Stable fingerprint that survives across scans; used for dedup + lifecycle
    fingerprint: text("fingerprint").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    category: text("category").notNull(), // e.g. "input_validation", "session_mgmt"
    wstgId: text("wstg_id"), // e.g. "WSTG-INPV-01"
    cwe: text("cwe"), // e.g. "CWE-79"
    severity: severityEnum("severity").notNull(),
    confidence: confidenceEnum("confidence").notNull(),
    cvss: text("cvss"), // vector string
    state: findingStateEnum("state").notNull().default("new"),
    assignedToUserId: uuid("assigned_to_user_id").references(() => users.id),
    firstSeenRunId: uuid("first_seen_run_id").references(() => scanRuns.id),
    lastSeenRunId: uuid("last_seen_run_id").references(() => scanRuns.id),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    remediation: text("remediation"),
    references: jsonb("references").notNull().default(sql`'[]'::jsonb`),
    duplicateOfId: uuid("duplicate_of_id"),
  },
  (t) => [
    uniqueIndex("findings_org_fp_uq").on(t.organizationId, t.fingerprint),
    index("findings_target_idx").on(t.targetId),
    index("findings_state_sev_idx").on(t.state, t.severity),
  ],
);

export const findingInstances = pgTable(
  "finding_instances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    findingId: uuid("finding_id")
      .notNull()
      .references(() => findings.id, { onDelete: "cascade" }),
    scanRunId: uuid("scan_run_id")
      .notNull()
      .references(() => scanRuns.id, { onDelete: "cascade" }),
    host: text("host").notNull(),
    method: text("method"),
    path: text("path"),
    parameter: text("parameter"),
    scannerProvenance: text("scanner_provenance").notNull(), // "internal.passive.headers" | "adapter.zap" | ...
    rawJson: jsonb("raw_json").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("finding_instances_finding_idx").on(t.findingId),
    index("finding_instances_run_idx").on(t.scanRunId),
  ],
);

export const findingEvidence = pgTable(
  "finding_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    findingInstanceId: uuid("finding_instance_id")
      .notNull()
      .references(() => findingInstances.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // "request" | "response" | "screenshot" | "dom"
    storageKey: text("storage_key").notNull(), // object storage pointer
    contentType: text("content_type").notNull(),
    sha256: text("sha256").notNull(),
    redacted: boolean("redacted").notNull().default(true),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("evidence_instance_idx").on(t.findingInstanceId)],
);

export const findingComments = pgTable(
  "finding_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    findingId: uuid("finding_id")
      .notNull()
      .references(() => findings.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("finding_comments_finding_idx").on(t.findingId)],
);

export const findingStateHistory = pgTable(
  "finding_state_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    findingId: uuid("finding_id")
      .notNull()
      .references(() => findings.id, { onDelete: "cascade" }),
    fromState: findingStateEnum("from_state"),
    toState: findingStateEnum("to_state").notNull(),
    changedByUserId: uuid("changed_by_user_id").references(() => users.id),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("finding_state_history_finding_idx").on(t.findingId)],
);

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    targetId: uuid("target_id")
      .notNull()
      .references(() => targets.id, { onDelete: "cascade" }),
    scanRunId: uuid("scan_run_id").references(() => scanRuns.id),
    kind: text("kind").notNull(), // "scan" | "target_rollup" | "diff" | "trend"
    title: text("title").notNull(),
    dto: jsonb("dto").notNull(), // fully assembled report DTO
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("reports_org_idx").on(t.organizationId)],
);

// ---------------------------------------------------------------------------
// Audit log, webhooks, usage
// ---------------------------------------------------------------------------

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    action: auditActionEnum("action").notNull(),
    targetType: text("target_type"), // "target" | "scan_run" | "finding" | ...
    targetId: uuid("target_id"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    // Immutable-in-practice: we never UPDATE these rows in the app layer.
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_logs_org_created_idx").on(t.organizationId, t.createdAt),
    index("audit_logs_action_idx").on(t.action),
  ],
);

export const webhooks = pgTable(
  "webhooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    secretRef: text("secret_ref").notNull(),
    events: jsonb("events").notNull().default(sql`'[]'::jsonb`),
    enabled: boolean("enabled").notNull().default(true),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("webhooks_org_idx").on(t.organizationId)],
);

export const usageCounters = pgTable(
  "usage_counters",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    period: text("period").notNull(), // "2026-01" or "2026-01-15"
    metric: text("metric").notNull(), // "scans_launched" | "requests_sent" | "active_scans"
    value: integer("value").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({
      columns: [t.organizationId, t.period, t.metric],
      name: "usage_counters_pk",
    }),
  ],
);
