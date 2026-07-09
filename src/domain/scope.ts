// ============================================================================
// Scope engine — the single choke point every worker MUST call before
// touching a URL. If this returns `false`, the worker aborts the request.
// This is defense-in-depth: even a buggy adapter can't attack out-of-scope
// hosts because the scope check runs inside a shared HTTP wrapper.
// ============================================================================

import type { CompiledScope, ScopeRule } from "./types";

const PRIVATE_CIDR_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "169.254.169.254", // AWS/GCP metadata
  "metadata.google.internal",
];

/** Compile raw rules into a fast lookup shape. */
export function compileScope(
  rules: ScopeRule[],
  defaults: Partial<CompiledScope> = {},
): CompiledScope {
  const compiled: CompiledScope = {
    allowHosts: [],
    denyHosts: [],
    allowPaths: [],
    denyPaths: [],
    allowedMethods: ["GET", "HEAD", "OPTIONS"],
    authRequired: false,
    maxRequestsPerSecond: 5,
    maxConcurrentRequests: 2,
    allowActive: false,
    requireVerification: true,
    ...defaults,
  };

  for (const rule of rules) {
    switch (rule.type) {
      case "allow_host":
        compiled.allowHosts.push(rule.pattern.toLowerCase());
        break;
      case "deny_host":
        compiled.denyHosts.push(rule.pattern.toLowerCase());
        break;
      case "allow_path":
        compiled.allowPaths.push(rule.pattern);
        break;
      case "deny_path":
        compiled.denyPaths.push(rule.pattern);
        break;
      case "allow_method":
        if (!compiled.allowedMethods.includes(rule.pattern.toUpperCase())) {
          compiled.allowedMethods.push(rule.pattern.toUpperCase());
        }
        break;
      case "deny_method":
        compiled.allowedMethods = compiled.allowedMethods.filter(
          (m) => m !== rule.pattern.toUpperCase(),
        );
        break;
      case "auth_required":
        compiled.authRequired = rule.pattern === "true";
        break;
      case "rate_limit": {
        const n = parseInt(rule.pattern, 10);
        if (!Number.isNaN(n) && n > 0) compiled.maxRequestsPerSecond = n;
        break;
      }
    }
  }

  return compiled;
}

export interface ScopeCheckResult {
  allowed: boolean;
  reason?: string;
  code?:
    | "HOST_NOT_ALLOWED"
    | "HOST_DENIED"
    | "PATH_DENIED"
    | "METHOD_DENIED"
    | "PRIVATE_ADDRESS"
    | "INVALID_URL"
    | "SCHEME_NOT_ALLOWED";
}

/** Check a single outbound request against compiled scope. */
export function checkScope(
  scope: CompiledScope,
  method: string,
  urlString: string,
): ScopeCheckResult {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return { allowed: false, reason: "invalid url", code: "INVALID_URL" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      allowed: false,
      reason: `scheme ${url.protocol} not allowed`,
      code: "SCHEME_NOT_ALLOWED",
    };
  }

  const host = url.hostname.toLowerCase();

  // Hard-block private / metadata endpoints regardless of user scope.
  if (isPrivateOrMetadataHost(host)) {
    return {
      allowed: false,
      reason: `host ${host} resolves to a private/metadata address`,
      code: "PRIVATE_ADDRESS",
    };
  }

  if (scope.denyHosts.some((p) => matchHost(p, host))) {
    return { allowed: false, reason: `deny_host match ${host}`, code: "HOST_DENIED" };
  }

  if (
    scope.allowHosts.length > 0 &&
    !scope.allowHosts.some((p) => matchHost(p, host))
  ) {
    return {
      allowed: false,
      reason: `host ${host} not in allow list`,
      code: "HOST_NOT_ALLOWED",
    };
  }

  if (scope.denyPaths.some((p) => matchPath(p, url.pathname))) {
    return {
      allowed: false,
      reason: `deny_path match ${url.pathname}`,
      code: "PATH_DENIED",
    };
  }

  if (!scope.allowedMethods.includes(method.toUpperCase())) {
    return {
      allowed: false,
      reason: `method ${method} not allowed`,
      code: "METHOD_DENIED",
    };
  }

  return { allowed: true };
}

function matchHost(pattern: string, host: string): boolean {
  if (pattern === host) return true;
  if (pattern.startsWith("*.")) {
    const suffix = pattern.slice(1); // ".example.com"
    return host.endsWith(suffix) && host.length > suffix.length;
  }
  return false;
}

function matchPath(pattern: string, path: string): boolean {
  // Prefix match by default; explicit /re:.../ syntax opts into regex.
  if (pattern.startsWith("/re:") && pattern.endsWith("/")) {
    try {
      const re = new RegExp(pattern.slice(4, -1));
      return re.test(path);
    } catch {
      return false;
    }
  }
  return path === pattern || path.startsWith(pattern);
}

function isPrivateOrMetadataHost(host: string): boolean {
  if (PRIVATE_CIDR_HOSTS.includes(host)) return true;
  // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (/^127\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  if (host.endsWith(".local")) return true;
  if (host.endsWith(".internal")) return true;
  return false;
}
