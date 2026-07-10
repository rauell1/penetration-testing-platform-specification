// Demonstrates the policy engine + scope check as pure functions.
// Callable to sanity-check what a scan launch would produce.
import { decidePolicy, type PolicyContext } from "@/domain/policy";
import { checkScope } from "@/domain/scope";
import type { CompiledScope } from "@/domain/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    activeRequested?: boolean;
    scope?: Partial<CompiledScope>;
    testUrl?: string;
    testMethod?: string;
  };

  const scope: CompiledScope = {
    allowHosts: ["shop.acme-security.example"],
    denyHosts: [],
    allowPaths: ["/"],
    denyPaths: ["/admin/dangerous-op"],
    allowedMethods: ["GET", "POST", "HEAD", "OPTIONS"],
    authRequired: false,
    maxRequestsPerSecond: 4,
    maxConcurrentRequests: 2,
    allowActive: true,
    requireVerification: true,
    pinnedHosts: [],
    ...body.scope,
  };

  const ctx: PolicyContext = {
    target: {
      id: "demo",
      activeScansEnabled: true,
      verified: true,
      hasValidAuthorizationArtifact: true,
      requiresManualApproval: false,
    },
    scope,
    profile: {
      kind: body.activeRequested ? "basic_active" : "passive",
      activeModulesRequested: !!body.activeRequested,
    },
    organization: {
      id: "demo",
      plan: "team",
      settings: { allowActiveScans: true, requireMfaForActive: true },
      emergencyStop: false,
    },
    actor: { id: "demo", role: "security_lead", mfaEnabled: true },
    usage: {
      monthlyScansUsed: 3,
      monthlyScansLimit: 200,
      concurrentScansRunning: 0,
      concurrentScansLimit: 3,
    },
    policyVersion: "2025.07.1",
    scopeHash: undefined,
  };

  const decision = decidePolicy(
    {
      organizationId: "demo",
      targetId: "demo",
      scopeId: "demo",
      scanProfileId: "demo",
      actorUserId: "demo",
      activeRequested: !!body.activeRequested,
    },
    ctx,
  );

  const scopeCheck = body.testUrl
    ? checkScope(scope, body.testMethod ?? "GET", body.testUrl)
    : null;

  return Response.json({ decision, scopeCheck });
}
