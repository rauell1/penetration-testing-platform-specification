// ============================================================================
// Aegis — Core TypeScript domain model.
// These types are the "contract" surface between the control plane (Next.js
// on Vercel) and the worker fleet (long-running compute off Vercel).
// ============================================================================

export type Severity = "info" | "low" | "medium" | "high" | "critical";
export type Confidence = "tentative" | "likely" | "confirmed";

export type Role =
  | "owner"
  | "admin"
  | "security_lead"
  | "engineer"
  | "auditor"
  | "viewer";

export type VerificationType =
  | "dns_txt"
  | "http_file"
  | "meta_tag"
  | "manual_document"
  | "enterprise_contract";

export type VerificationStatus =
  | "pending"
  | "verified"
  | "expired"
  | "revoked"
  | "failed";

export type ScopeRuleType =
  | "allow_host"
  | "deny_host"
  | "allow_path"
  | "deny_path"
  | "allow_method"
  | "deny_method"
  | "auth_required"
  | "rate_limit";

export type ScanProfileKind =
  | "passive"
  | "basic_active"
  | "deep_active"
  | "api_focused"
  | "auth_focused";

export type ScanRunStatus =
  | "queued"
  | "policy_preflight"
  | "resolving"
  | "crawling"
  | "passive"
  | "active"
  | "normalizing"
  | "reporting"
  | "completed"
  | "failed"
  | "cancelled"
  | "killed";

export type FindingState =
  | "new"
  | "triaged"
  | "confirmed"
  | "in_remediation"
  | "resolved"
  | "wont_fix"
  | "false_positive"
  | "accepted_risk";

export type AuthMode =
  | "none"
  | "cookie"
  | "bearer"
  | "header"
  | "basic"
  | "scripted_browser";

// ---------------------------------------------------------------------------
// Scope: canonical compiled form handed to every worker.
// ---------------------------------------------------------------------------

export interface CompiledScope {
  allowHosts: string[]; // exact or wildcard, e.g. "*.example.com"
  denyHosts: string[];
  allowPaths: string[]; // path prefixes; regex allowed for admin-only rules
  denyPaths: string[];
  allowedMethods: string[]; // ["GET","POST",...]
  authRequired: boolean;
  maxRequestsPerSecond: number;
  maxConcurrentRequests: number;
  allowActive: boolean;
  requireVerification: boolean;
  pinnedHosts: { host: string; ips: string[] }[]; // DNS-pinned hosts for anti-rebinding
}

export interface ScopeRule {
  id: string;
  type: ScopeRuleType;
  pattern: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Scan profile: what a scan is allowed to do, snapshot immutably per-run.
// ---------------------------------------------------------------------------

export interface ScanProfileConfig {
  requestBudget: number; // hard cap on total requests
  timeoutMs: number; // hard wall-clock cap
  maxDepth: number;
  maxPages: number;
  headers: Record<string, string>;
  modules: {
    passive: {
      headers: boolean;
      cookies: boolean;
      tls: boolean;
      mixedContent: boolean;
      fingerprint: boolean;
    };
    active: {
      reflectedXss: boolean;
      sqliIndicators: boolean;
      pathTraversal: boolean;
      openRedirect: boolean;
      // Deliberately no post-exploitation or destructive modules.
    };
    adapters: {
      zap: boolean;
      nuclei: boolean;
      sqlmapSafeMode: boolean;
      tlsScanner: boolean;
    };
  };
}

// ---------------------------------------------------------------------------
// Policy decision: single source of truth for "is this scan allowed?"
// ---------------------------------------------------------------------------

export interface PolicyDecisionInput {
  organizationId: string;
  targetId: string;
  scopeId: string;
  scanProfileId: string;
  actorUserId: string;
  activeRequested: boolean;
}

export interface PolicyDecision {
  allowed: boolean;
  reasons: string[]; // human-readable reasons (both allow and deny)
  denyCodes: PolicyDenyCode[]; // stable codes for programmatic checks
  effectiveScope: CompiledScope;
  quotaSnapshot: {
    monthlyScansUsed: number;
    monthlyScansLimit: number;
    concurrentScansRunning: number;
    concurrentScansLimit: number;
  };
  decidedAt: string; // ISO
}

/**
 * Stable deny codes emitted by the policy engine. Mirrors the blueprint's
 * PreflightErrorCode set (Part 17.4): platform/org kill switch, policy-version
 * staleness, target verification, authorization, mode-in-scope, quota, and
 * concurrency, plus scope drift detected at worker pull time.
 */
export type PolicyDenyCode =
  | "ROLE_INSUFFICIENT"
  | "TARGET_NOT_VERIFIED"
  | "ORG_ACTIVE_DISABLED"
  | "TARGET_ACTIVE_DISABLED"
  | "SCOPE_ACTIVE_DISABLED"
  | "MODE_NOT_IN_SCOPE"
  | "MFA_REQUIRED"
  | "ORG_KILL_SWITCH"
  | "PLATFORM_KILL_SWITCH"
  | "POLICY_VERSION_STALE"
  | "SCOPE_DRIFT"
  | "QUOTA_MONTHLY_EXCEEDED"
  | "QUOTA_CONCURRENT_EXCEEDED"
  | "SCOPE_EMPTY";

/** Current policy engine version; workers reject claims with a stale version. */
export const POLICY_VERSION = "2025.07.1";

// ---------------------------------------------------------------------------
// Queue payloads
// ---------------------------------------------------------------------------

export type ScanJobKind =
  | "crawl.http"
  | "crawl.browser"
  | "passive.headers"
  | "passive.tls"
  | "passive.cookies"
  | "passive.fingerprint"
  | "active.reflected_xss"
  | "active.sqli_indicator"
  | "active.path_traversal"
  | "active.open_redirect"
  | "adapter.zap"
  | "adapter.nuclei"
  | "adapter.tls"
  | "normalize"
  | "report.assemble";

export interface ScanJobPayload<TKind extends ScanJobKind = ScanJobKind> {
  kind: TKind;
  scanRunId: string;
  organizationId: string;
  targetId: string;
  scope: CompiledScope;
  profile: ScanProfileConfig;
  input: Record<string, unknown>;
  // Signed at enqueue time by the orchestrator; workers verify before acting.
  claim: string;
}

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------

export interface RawScannerFinding {
  scannerProvenance: string; // "internal.passive.headers" | "adapter.zap.10038"
  title: string;
  summary: string;
  category: string;
  wstgId?: string;
  cwe?: string;
  severity: Severity;
  confidence: Confidence;
  host: string;
  method?: string;
  path?: string;
  parameter?: string;
  evidence: RawEvidence[];
  raw: Record<string, unknown>;
}

export interface RawEvidence {
  kind: "request" | "response" | "screenshot" | "dom";
  contentType: string;
  data: Buffer | string; // workers pass bytes; normalizer redacts + stores
}

export interface NormalizedFinding {
  fingerprint: string;
  title: string;
  summary: string;
  category: string;
  wstgId?: string;
  cwe?: string;
  severity: Severity;
  confidence: Confidence;
  host: string;
  method?: string;
  path?: string;
  parameter?: string;
  scannerProvenance: string[];
  remediation?: string;
  references: string[];
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface ReportDTO {
  version: 1;
  generatedAt: string;
  organization: { id: string; name: string };
  target: { id: string; label: string; primaryHost: string };
  scanRun: {
    id: string;
    profileName: string;
    status: ScanRunStatus;
    startedAt: string | null;
    finishedAt: string | null;
    stats: Record<string, number>;
  };
  summary: {
    total: number;
    bySeverity: Record<Severity, number>;
    byCategory: Record<string, number>;
  };
  findings: Array<{
    id: string;
    title: string;
    severity: Severity;
    confidence: Confidence;
    category: string;
    wstgId?: string;
    cwe?: string;
    host: string;
    path?: string;
    method?: string;
    scannerProvenance: string[];
    remediation?: string;
    firstSeenAt: string;
    lastSeenAt: string;
  }>;
}
