// Idempotent seed: creates a demo org, target (verified), scope, profile,
// two completed scan runs, and a spread of findings across severities.
// Safe to run repeatedly — every insert is guarded by an existence check.

import { sql } from "drizzle-orm";
import { db } from "./index";
import {
  organizations,
  users,
  memberships,
  targets,
  targetVerifications,
  scopes,
  scopeRules,
  scanProfiles,
  scanRuns,
  findings,
  findingInstances,
  auditLogs,
} from "./schema";
import { fingerprintFinding } from "@/domain/fingerprint";
import type { CompiledScope, ScanProfileConfig } from "@/domain/types";

const DEMO_ORG_SLUG = "acme-security";
const DEMO_USER_EMAIL = "lead@acme-security.example";
const DEMO_TARGET_HOST = "shop.acme-security.example";

const COMPILED_SCOPE: CompiledScope = {
  allowHosts: ["shop.acme-security.example", "*.shop.acme-security.example"],
  denyHosts: ["admin-internal.acme-security.example"],
  allowPaths: ["/"],
  denyPaths: ["/admin/dangerous-op", "/logout"],
  allowedMethods: ["GET", "HEAD", "OPTIONS", "POST"],
  authRequired: false,
  maxRequestsPerSecond: 4,
  maxConcurrentRequests: 2,
  allowActive: true,
  requireVerification: true,
};

const PROFILE_CONFIG: ScanProfileConfig = {
  requestBudget: 5000,
  timeoutMs: 30 * 60 * 1000,
  maxDepth: 4,
  maxPages: 400,
  headers: { "User-Agent": "Aegis/1.0 (+authorized-scan)" },
  modules: {
    passive: { headers: true, cookies: true, tls: true, mixedContent: true, fingerprint: true },
    active: { reflectedXss: true, sqliIndicators: true, pathTraversal: true, openRedirect: true },
    adapters: { zap: true, nuclei: true, sqlmapSafeMode: false, tlsScanner: true },
  },
};

async function main() {
  console.log("🌱 seeding Aegis demo data…");

  // 1. Org
  const [org] =
    (await db
      .select()
      .from(organizations)
      .where(sql`slug = ${DEMO_ORG_SLUG}`)) ?? [];
  const orgRow =
    org ??
    (
      await db
        .insert(organizations)
        .values({
          slug: DEMO_ORG_SLUG,
          name: "Acme Security",
          plan: "team",
          settings: { requireMfaForActive: true, allowActiveScans: true, maxConcurrentScans: 3 },
          quotas: { monthlyScans: 200, maxTargets: 25 },
        })
        .returning()
    )[0];

  // 2. User + membership
  const [existingUser] =
    (await db
      .select()
      .from(users)
      .where(sql`email = ${DEMO_USER_EMAIL}`)) ?? [];
  const userRow =
    existingUser ??
    (
      await db
        .insert(users)
        .values({
          email: DEMO_USER_EMAIL,
          displayName: "Priya Ramanathan",
          mfaEnabled: true,
        })
        .returning()
    )[0];

  const existingMembership = await db
    .select()
    .from(memberships)
    .where(sql`organization_id = ${orgRow.id} AND user_id = ${userRow.id}`);
  if (existingMembership.length === 0) {
    await db.insert(memberships).values({
      organizationId: orgRow.id,
      userId: userRow.id,
      role: "security_lead",
    });
  }

  // 3. Target (verified)
  const [existingTarget] =
    (await db
      .select()
      .from(targets)
      .where(sql`organization_id = ${orgRow.id} AND primary_host = ${DEMO_TARGET_HOST}`)) ??
    [];
  const targetRow =
    existingTarget ??
    (
      await db
        .insert(targets)
        .values({
          organizationId: orgRow.id,
          label: "Acme Shop (staging)",
          primaryHost: DEMO_TARGET_HOST,
          kind: "web_app",
          baseUrl: `https://${DEMO_TARGET_HOST}`,
          description: "Customer-facing storefront, staging environment",
          activeScansEnabled: true,
          createdByUserId: userRow.id,
        })
        .returning()
    )[0];

  const existingVerification = await db
    .select()
    .from(targetVerifications)
    .where(sql`target_id = ${targetRow.id} AND status = 'verified'`);
  if (existingVerification.length === 0) {
    await db.insert(targetVerifications).values({
      organizationId: orgRow.id,
      targetId: targetRow.id,
      type: "dns_txt",
      status: "verified",
      challenge: "aegis-verify=b7f3a9e21c4d",
      evidence: { record: "TXT aegis-verify=b7f3a9e21c4d", resolvedAt: new Date().toISOString() },
      verifiedAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
    });
  }

  // 4. Scope + rules
  const [existingScope] =
    (await db
      .select()
      .from(scopes)
      .where(sql`target_id = ${targetRow.id} AND name = 'default'`)) ?? [];
  const scopeRow =
    existingScope ??
    (
      await db
        .insert(scopes)
        .values({
          organizationId: orgRow.id,
          targetId: targetRow.id,
          name: "default",
          isDefault: true,
          compiled: COMPILED_SCOPE,
        })
        .returning()
    )[0];

  const existingScopeRules = await db
    .select()
    .from(scopeRules)
    .where(sql`scope_id = ${scopeRow.id}`);
  if (existingScopeRules.length === 0) {
    await db.insert(scopeRules).values([
      { scopeId: scopeRow.id, type: "allow_host", pattern: DEMO_TARGET_HOST },
      { scopeId: scopeRow.id, type: "allow_host", pattern: `*.${DEMO_TARGET_HOST}` },
      { scopeId: scopeRow.id, type: "deny_host", pattern: "admin-internal.acme-security.example" },
      { scopeId: scopeRow.id, type: "deny_path", pattern: "/admin/dangerous-op" },
      { scopeId: scopeRow.id, type: "deny_path", pattern: "/logout" },
      { scopeId: scopeRow.id, type: "allow_method", pattern: "POST" },
      { scopeId: scopeRow.id, type: "rate_limit", pattern: "4" },
    ]);
  }

  // 5. Scan profile
  const [existingProfile] =
    (await db
      .select()
      .from(scanProfiles)
      .where(sql`organization_id = ${orgRow.id} AND name = 'Weekly deep active'`)) ?? [];
  const profileRow =
    existingProfile ??
    (
      await db
        .insert(scanProfiles)
        .values({
          organizationId: orgRow.id,
          name: "Weekly deep active",
          kind: "deep_active",
          config: PROFILE_CONFIG,
        })
        .returning()
    )[0];

  // 6. Two scan runs (only insert if none exist for this target)
  const existingRuns = await db
    .select()
    .from(scanRuns)
    .where(sql`target_id = ${targetRow.id}`);
  if (existingRuns.length === 0) {
    const earlier = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
    const recent = new Date(Date.now() - 1000 * 60 * 60 * 2);
    const commonSnapshot = {
      scopeSnapshot: COMPILED_SCOPE,
      profileSnapshot: PROFILE_CONFIG,
      policyDecision: {
        allowed: true,
        reasons: ["all preflight gates passed"],
        denyCodes: [],
        decidedAt: new Date().toISOString(),
      },
    };
    const [runA] = await db
      .insert(scanRuns)
      .values({
        organizationId: orgRow.id,
        targetId: targetRow.id,
        scopeId: scopeRow.id,
        scanProfileId: profileRow.id,
        launchedByUserId: userRow.id,
        status: "completed",
        progress: 100,
        startedAt: earlier,
        finishedAt: new Date(earlier.getTime() + 1000 * 60 * 42),
        stats: { pages: 312, requests: 4118, findings: 11 },
        ...commonSnapshot,
      })
      .returning();
    const [runB] = await db
      .insert(scanRuns)
      .values({
        organizationId: orgRow.id,
        targetId: targetRow.id,
        scopeId: scopeRow.id,
        scanProfileId: profileRow.id,
        launchedByUserId: userRow.id,
        status: "completed",
        progress: 100,
        startedAt: recent,
        finishedAt: new Date(recent.getTime() + 1000 * 60 * 38),
        stats: { pages: 341, requests: 4402, findings: 9 },
        ...commonSnapshot,
      })
      .returning();

    // 7. Findings — a realistic OWASP WSTG-aligned spread
    const seeds: Array<{
      title: string;
      summary: string;
      category: string;
      wstgId: string;
      cwe?: string;
      severity: "info" | "low" | "medium" | "high" | "critical";
      confidence: "tentative" | "firm" | "certain";
      host: string;
      method?: string;
      path?: string;
      parameter?: string;
      provenance: string;
      remediation: string;
    }> = [
      {
        title: "Missing Content-Security-Policy header",
        summary:
          "The application does not set a CSP header on HTML responses, leaving no browser-side defense against XSS payload execution.",
        category: "configuration",
        wstgId: "WSTG-CONF-12",
        cwe: "CWE-693",
        severity: "medium",
        confidence: "certain",
        host: DEMO_TARGET_HOST,
        method: "GET",
        path: "/",
        provenance: "internal.passive.headers",
        remediation:
          "Return a Content-Security-Policy header on all HTML responses. Start with a report-only policy and tighten iteratively.",
      },
      {
        title: "Session cookie missing Secure and HttpOnly flags",
        summary:
          "The `session` cookie is set without the Secure or HttpOnly attributes, enabling theft over plaintext channels and via injected JavaScript.",
        category: "session_management",
        wstgId: "WSTG-SESS-02",
        cwe: "CWE-1004",
        severity: "high",
        confidence: "certain",
        host: DEMO_TARGET_HOST,
        method: "POST",
        path: "/login",
        parameter: "session",
        provenance: "internal.passive.cookies",
        remediation:
          "Set `Secure; HttpOnly; SameSite=Lax` (or Strict) on all session cookies. Reject requests over HTTP.",
      },
      {
        title: "Reflected XSS indicator in `q` parameter",
        summary:
          "The `q` query parameter on /search is reflected in the response body without contextual output encoding. A safe probe payload triggered the marker.",
        category: "input_validation",
        wstgId: "WSTG-INPV-01",
        cwe: "CWE-79",
        severity: "high",
        confidence: "firm",
        host: DEMO_TARGET_HOST,
        method: "GET",
        path: "/search",
        parameter: "q",
        provenance: "internal.active.reflected_xss",
        remediation:
          "Apply context-aware output encoding (HTML/attribute/JS) at the template layer. Add a strict CSP as a second layer of defense.",
      },
      {
        title: "SQL error message leaked on invalid input",
        summary:
          "Malformed input to `/products?id=` returns a database error message including the driver name. This indicates a SQL injection surface and leaks stack detail.",
        category: "input_validation",
        wstgId: "WSTG-INPV-05",
        cwe: "CWE-89",
        severity: "critical",
        confidence: "firm",
        host: DEMO_TARGET_HOST,
        method: "GET",
        path: "/products",
        parameter: "id",
        provenance: "internal.active.sqli_indicator",
        remediation:
          "Use parameterized queries or an ORM binding for the `id` parameter. Return a generic error to the client and log the detail server-side only.",
      },
      {
        title: "Open redirect via `next` parameter",
        summary:
          "The `next` parameter on /login is used as a redirect target without host allowlisting.",
        category: "input_validation",
        wstgId: "WSTG-CLNT-04",
        cwe: "CWE-601",
        severity: "medium",
        confidence: "firm",
        host: DEMO_TARGET_HOST,
        method: "GET",
        path: "/login",
        parameter: "next",
        provenance: "internal.active.open_redirect",
        remediation:
          "Only redirect to relative paths or hosts on an explicit allowlist. Reject absolute URLs from user input.",
      },
      {
        title: "TLS 1.0 and TLS 1.1 accepted",
        summary: "The endpoint negotiates deprecated TLS versions.",
        category: "cryptography",
        wstgId: "WSTG-CRYP-01",
        cwe: "CWE-327",
        severity: "medium",
        confidence: "certain",
        host: DEMO_TARGET_HOST,
        provenance: "adapter.tls",
        remediation: "Disable TLS 1.0/1.1 at the load balancer. Require TLS 1.2+.",
      },
      {
        title: "X-Frame-Options / frame-ancestors not set",
        summary:
          "No clickjacking protection headers are present on authenticated pages.",
        category: "configuration",
        wstgId: "WSTG-CLNT-09",
        cwe: "CWE-1021",
        severity: "low",
        confidence: "certain",
        host: DEMO_TARGET_HOST,
        method: "GET",
        path: "/account",
        provenance: "internal.passive.headers",
        remediation:
          "Set `Content-Security-Policy: frame-ancestors 'none'` on authenticated views.",
      },
      {
        title: "Verbose server banner",
        summary: "`Server: nginx/1.21.3` is returned, exposing the exact software version.",
        category: "information_gathering",
        wstgId: "WSTG-INFO-02",
        severity: "info",
        confidence: "certain",
        host: DEMO_TARGET_HOST,
        method: "GET",
        path: "/",
        provenance: "internal.passive.fingerprint",
        remediation: "Strip or generalize the Server header at the edge.",
      },
      {
        title: "Login endpoint has no rate limiting",
        summary:
          "100 sequential POSTs to /login with different passwords all received a normal error response with no throttling.",
        category: "authentication",
        wstgId: "WSTG-ATHN-03",
        cwe: "CWE-307",
        severity: "high",
        confidence: "firm",
        host: DEMO_TARGET_HOST,
        method: "POST",
        path: "/login",
        provenance: "internal.active.rate_limit_probe",
        remediation:
          "Add per-IP and per-account throttling with exponential backoff. Consider CAPTCHA after N failures.",
      },
    ];

    for (const s of seeds) {
      const fp = fingerprintFinding(s);
      const [f] = await db
        .insert(findings)
        .values({
          organizationId: orgRow.id,
          targetId: targetRow.id,
          fingerprint: fp,
          title: s.title,
          summary: s.summary,
          category: s.category,
          wstgId: s.wstgId,
          cwe: s.cwe,
          severity: s.severity,
          confidence: s.confidence,
          state: "new",
          firstSeenRunId: runA.id,
          lastSeenRunId: runB.id,
          firstSeenAt: earlier,
          lastSeenAt: recent,
          remediation: s.remediation,
          references: [
            `https://owasp.org/www-project-web-security-testing-guide/latest/`,
          ],
        })
        .returning();
      await db.insert(findingInstances).values([
        {
          findingId: f.id,
          scanRunId: runA.id,
          host: s.host,
          method: s.method,
          path: s.path,
          parameter: s.parameter,
          scannerProvenance: s.provenance,
          rawJson: { note: "seed instance" },
        },
        {
          findingId: f.id,
          scanRunId: runB.id,
          host: s.host,
          method: s.method,
          path: s.path,
          parameter: s.parameter,
          scannerProvenance: s.provenance,
          rawJson: { note: "seed instance" },
        },
      ]);
    }

    await db.insert(auditLogs).values([
      {
        organizationId: orgRow.id,
        actorUserId: userRow.id,
        action: "target.verify_success",
        targetType: "target",
        targetId: targetRow.id,
        payload: { type: "dns_txt" },
      },
      {
        organizationId: orgRow.id,
        actorUserId: userRow.id,
        action: "scan.launch",
        targetType: "scan_run",
        targetId: runA.id,
        payload: { profile: "Weekly deep active" },
      },
      {
        organizationId: orgRow.id,
        actorUserId: userRow.id,
        action: "scan.completed",
        targetType: "scan_run",
        targetId: runA.id,
        payload: { findings: 11 },
      },
      {
        organizationId: orgRow.id,
        actorUserId: userRow.id,
        action: "scan.launch",
        targetType: "scan_run",
        targetId: runB.id,
        payload: { profile: "Weekly deep active" },
      },
      {
        organizationId: orgRow.id,
        actorUserId: userRow.id,
        action: "scan.completed",
        targetType: "scan_run",
        targetId: runB.id,
        payload: { findings: 9 },
      },
    ]);
  }

  console.log("✅ seed complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
