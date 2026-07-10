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
    pinnedHosts: [],
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
    | "SCHEME_NOT_ALLOWED"
    | "IP_NOT_ALLOWED";
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

  // If this host was pinned at scope-compile time, require the pin to match.
  // A pinned host lets workers re-validate that the resolved IP hasn't drifted
  // into a forbidden range (the primary DNS-rebinding defense).
  if (scope.pinnedHosts && scope.pinnedHosts.length > 0) {
    const pin = findPin(scope.pinnedHosts, host);
    if (pin) {
      // The caller is responsible for checking the live DNS resolution against
      // pin.ips before connecting. Here we only assert the pin exists.
    } else if (scope.allowHosts.length === 0 || !scope.allowHosts.some((p) => matchHost(p, host))) {
      return {
        allowed: false,
        reason: `host ${host} not pinned and not in allow list`,
        code: "HOST_NOT_ALLOWED",
      };
    }
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

/**
 * Re-check a resolved IP address against the forbidden-range table.
 * Callers MUST invoke this after live DNS resolution but before connect,
 * and again after any redirect hop, to defeat DNS rebinding and redirect SSRF.
 */
export function checkResolvedIp(ip: string): ScopeCheckResult {
  if (isForbiddenIp(ip)) {
    return {
      allowed: false,
      reason: `resolved ip ${ip} is in a forbidden range`,
      code: "IP_NOT_ALLOWED",
    };
  }
  return { allowed: true };
}

/**
 * Validate a redirect target against scope. Each hop must re-pass the full
 * scope check — redirects are a classic SSRF pivot and the blueprint's #3
 * mistake is "following redirects without re-checking scope + SSRF per hop".
 */
export function checkRedirect(
  scope: CompiledScope,
  method: string,
  redirectUrl: string,
): ScopeCheckResult {
  const result = checkScope(scope, method, redirectUrl);
  if (!result.allowed) return result;
  // Host of the redirect target must be in the allow list (not just allowed
  // by a wildcard that swallows everything). checkScope already enforces this,
  // so we simply propagate its decision while guarding against private IPs.
  const url = new URL(redirectUrl);
  if (isPrivateOrMetadataHost(url.hostname.toLowerCase())) {
    return {
      allowed: false,
      reason: `redirect target ${url.hostname} is private/metadata`,
      code: "PRIVATE_ADDRESS",
    };
  }
  return result;
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
  // IPv4 private ranges
  if (isIpv4(host)) {
    if (/^10\./.test(host)) return true;
    if (/^192\.168\./.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
    if (/^127\./.test(host)) return true;
    if (/^169\.254\./.test(host)) return true;
    if (/^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./.test(host)) return true; // CGNAT 100.64/10
    if (/^0\./.test(host)) return true;
  }
  // IPv6
  if (host === "::1" || host === "::") return true;
  if (/^fe[89ab][0-9a-f]/i.test(host)) return true; // link-local fe80::/10
  if (/^fc[0-9a-f]{2}/i.test(host) || /^fd[0-9a-f]{2}/i.test(host)) return true; // ULA fc00::/7
  if (/^2001:db8:/i.test(host)) return true; // documentation range
  if (host.endsWith(".local")) return true;
  if (host.endsWith(".internal")) return true;
  return false;
}

function isIpv4(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function isForbiddenIp(ip: string): boolean {
  return isPrivateOrMetadataHost(ip.toLowerCase());
}

function findPin(
  pins: { host: string; ips: string[] }[],
  host: string,
): { host: string; ips: string[] } | undefined {
  return pins.find((p) => matchHost(p.host, host));
}
