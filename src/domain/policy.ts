// ============================================================================
// Policy engine — decides whether a scan may launch. Every launch goes
// through this. The result is snapshotted onto the scan_run row so that
// audits can prove exactly which inputs the decision was decided from.
// ============================================================================

import type {
  CompiledScope,
  PolicyDecision,
  PolicyDecisionInput,
  PolicyDenyCode,
} from "./types";
import { POLICY_VERSION } from "./types";

export interface PolicyContext {
  target: {
    id: string;
    activeScansEnabled: boolean;
    verified: boolean;
    hasValidAuthorizationArtifact: boolean;
    requiresManualApproval: boolean;
  };
  scope: CompiledScope;
  profile: {
    kind: "passive" | "basic_active" | "deep_active" | "api_focused" | "auth_focused";
    activeModulesRequested: boolean;
  };
  organization: {
    id: string;
    plan: string;
    settings: {
      requireMfaForActive?: boolean;
      allowActiveScans?: boolean;
    };
    // Org-level kill switch. When true, no new scans (active or passive) launch.
    emergencyStop: boolean;
  };
  actor: {
    id: string;
    role: "owner" | "admin" | "security_lead" | "engineer" | "auditor" | "viewer";
    mfaEnabled: boolean;
  };
  usage: {
    monthlyScansUsed: number;
    monthlyScansLimit: number;
    concurrentScansRunning: number;
    concurrentScansLimit: number;
  };
  // The policy version the caller compiled against; must match POLICY_VERSION.
  policyVersion: string;
  // If provided, the scope hash the caller computed; the engine stores it on
  // the scan_run so workers can re-verify and abort on SCOPE_DRIFT.
  scopeHash?: string;
}

// Platform-wide kill switch (env override). When set, all scans across all
// orgs are blocked at preflight.
let PLATFORM_KILL_SWITCH = false;
export function setPlatformKillSwitch(on: boolean) {
  PLATFORM_KILL_SWITCH = on;
}
export function isPlatformKillSwitchOn() {
  return PLATFORM_KILL_SWITCH;
}

const ROLE_CAN_LAUNCH_PASSIVE: PolicyContext["actor"]["role"][] = [
  "owner",
  "admin",
  "security_lead",
  "engineer",
];

const ROLE_CAN_LAUNCH_ACTIVE: PolicyContext["actor"]["role"][] = [
  "owner",
  "admin",
  "security_lead",
];

export function decidePolicy(
  input: PolicyDecisionInput,
  ctx: PolicyContext,
): PolicyDecision {
  const reasons: string[] = [];
  const denyCodes: PolicyDenyCode[] = [];

  // --- Platform kill switch (highest priority) ---
  if (isPlatformKillSwitchOn()) {
    denyCodes.push("PLATFORM_KILL_SWITCH");
    reasons.push("platform kill switch is engaged");
  }

  // --- Org kill switch ---
  if (ctx.organization.emergencyStop) {
    denyCodes.push("ORG_KILL_SWITCH");
    reasons.push("organization emergency_stop is engaged");
  }

  // --- Policy version staleness ---
  if (ctx.policyVersion !== POLICY_VERSION) {
    denyCodes.push("POLICY_VERSION_STALE");
    reasons.push(
      `policy version ${ctx.policyVersion} is stale (engine expects ${POLICY_VERSION})`,
    );
  }

  // --- Role gate ---
  const allowedRoles = input.activeRequested
    ? ROLE_CAN_LAUNCH_ACTIVE
    : ROLE_CAN_LAUNCH_PASSIVE;
  if (!allowedRoles.includes(ctx.actor.role)) {
    denyCodes.push("ROLE_INSUFFICIENT");
    reasons.push(
      `role ${ctx.actor.role} may not launch a ${input.activeRequested ? "active" : "passive"} scan`,
    );
  }

  // --- Verification gate (hard requirement) ---
  if (!ctx.target.verified) {
    denyCodes.push("TARGET_NOT_VERIFIED");
    reasons.push("target ownership has not been verified");
  }

  // --- Mode-in-scope gate ---
  if (input.activeRequested && !ctx.scope.allowActive) {
    denyCodes.push("MODE_NOT_IN_SCOPE");
    reasons.push("active scanning is not permitted by the target's scope");
  }

  // --- Active scan gates ---
  if (input.activeRequested) {
    if (!ctx.organization.settings.allowActiveScans) {
      denyCodes.push("ORG_ACTIVE_DISABLED");
      reasons.push("organization has not enabled active scanning");
    }
    if (!ctx.target.activeScansEnabled) {
      denyCodes.push("TARGET_ACTIVE_DISABLED");
      reasons.push("target has not opted in to active scanning");
    }
    if (!ctx.scope.allowActive) {
      denyCodes.push("SCOPE_ACTIVE_DISABLED");
      reasons.push("scope does not permit active scanning");
    }
    if (
      ctx.organization.settings.requireMfaForActive &&
      !ctx.actor.mfaEnabled
    ) {
      denyCodes.push("MFA_REQUIRED");
      reasons.push("MFA is required to launch active scans");
    }
    if (ctx.target.requiresManualApproval && !ctx.target.hasValidAuthorizationArtifact) {
      // For deep-active targets requiring manual approval, an authorization
      // artifact is a hard block. Otherwise it remains a soft warning.
      denyCodes.push("MFA_REQUIRED");
      reasons.push("manual-approval target requires a signed authorization artifact");
    }
    if (!ctx.target.hasValidAuthorizationArtifact) {
      // Soft warning — not a hard block on all plans.
      reasons.push(
        "no signed authorization artifact on file (recommended for active scans)",
      );
    }
  }

  // --- Quota gates ---
  if (ctx.usage.monthlyScansUsed >= ctx.usage.monthlyScansLimit) {
    denyCodes.push("QUOTA_MONTHLY_EXCEEDED");
    reasons.push(
      `monthly scan quota exhausted (${ctx.usage.monthlyScansUsed}/${ctx.usage.monthlyScansLimit})`,
    );
  }
  if (ctx.usage.concurrentScansRunning >= ctx.usage.concurrentScansLimit) {
    denyCodes.push("QUOTA_CONCURRENT_EXCEEDED");
    reasons.push(
      `concurrent scan limit reached (${ctx.usage.concurrentScansRunning}/${ctx.usage.concurrentScansLimit})`,
    );
  }

  // --- Scope sanity ---
  if (ctx.scope.allowHosts.length === 0) {
    denyCodes.push("SCOPE_EMPTY");
    reasons.push("scope has no allowed hosts");
  }

  const allowed = denyCodes.length === 0;
  if (allowed) reasons.unshift("all preflight gates passed");

  // Effective scope pins allowActive to what the profile actually asked for.
  const effectiveScope: CompiledScope = {
    ...ctx.scope,
    allowActive: ctx.scope.allowActive && input.activeRequested,
  };

  return {
    allowed,
    reasons,
    denyCodes,
    effectiveScope,
    quotaSnapshot: {
      monthlyScansUsed: ctx.usage.monthlyScansUsed,
      monthlyScansLimit: ctx.usage.monthlyScansLimit,
      concurrentScansRunning: ctx.usage.concurrentScansRunning,
      concurrentScansLimit: ctx.usage.concurrentScansLimit,
    },
    decidedAt: new Date().toISOString(),
  };
}
