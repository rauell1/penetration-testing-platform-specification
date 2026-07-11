// ============================================================================
// Validation error class
// ============================================================================

export class ValidationError extends Error {
  public readonly fieldErrors: Record<string, string[]>;
  constructor(fieldErrors: Record<string, string[]>) {
    super("Validation failed");
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

// ============================================================================
// Auth Middleware - Higher-order function for API route protection
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthContext, checkRateLimit, auditLog, type AuthContext } from "./auth";

// ============================================================================
// Type extensions
// ============================================================================

interface AuthenticatedRequest extends NextRequest {
  authContext?: AuthContext;
  validatedBody?: unknown;
  validatedQuery?: unknown;
}

interface MiddlewareOptions {
  requireAuth?: boolean;
  requiredRole?: keyof typeof import("./auth").ROLE_HIERARCHY;
  validateBody?: z.ZodSchema;
  validateQuery?: z.ZodSchema;
  auditAction?: string;
  auditResourceType?: string;
  rateLimit?: { maxRequests: number; windowMs: number };
}

// ============================================================================
// Middleware wrapper
// ============================================================================

export function withMiddleware(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>,
  options: MiddlewareOptions = {}
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let authContext: AuthContext | null = null;

    try {
      // 1. Authentication (skip for public routes like login/register)
      if (options.requireAuth !== false) {
        authContext = await getAuthContext(req);
        if (!authContext) {
          return NextResponse.json(
            { error: "Unauthorized", code: "UNAUTHORIZED" },
            { status: 401 }
          );
        }
      }

      // 2. Role check
      if (options.requiredRole) {
        if (!authContext) {
          return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
        }
        const { ROLE_HIERARCHY } = await import("./auth");
        const userLevel = ROLE_HIERARCHY[authContext.membership.role as keyof typeof ROLE_HIERARCHY] ?? 0;
        const requiredLevel = ROLE_HIERARCHY[options.requiredRole];
        if (userLevel < requiredLevel) {
          return NextResponse.json(
            { error: "Forbidden", code: "INSUFFICIENT_ROLE", required: options.requiredRole },
            { status: 403 }
          );
        }
      }

      // 3. Body validation (must run before handler)
      if (options.validateBody) {
        const body = await req.json().catch(() => ({}));
        const result = options.validateBody.safeParse(body);
        if (!result.success) {
          return NextResponse.json(
            { error: "Validation failed", code: "VALIDATION_ERROR", details: result.error.flatten().fieldErrors },
            { status: 400 }
          );
        }
        (req as AuthenticatedRequest).validatedBody = result.data;
      }

      // 4. Query validation (must run before handler)
      if (options.validateQuery) {
        const url = new URL(req.url);
        const params: Record<string, string> = {};
        url.searchParams.forEach((v, k) => { params[k] = v; });
        const result = options.validateQuery.safeParse(params);
        if (!result.success) {
          return NextResponse.json(
            { error: "Validation failed", code: "VALIDATION_ERROR", details: result.error.flatten().fieldErrors },
            { status: 400 }
          );
        }
        (req as AuthenticatedRequest).validatedQuery = result.data;
      }

      // 5. Rate limiting
      let rateLimitResult: { remaining: number; resetAt: number } | null = null;
      if (options.rateLimit) {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const orgId = authContext?.organization?.id ?? "anon";
        const key = `ratelimit:${orgId}:${ip}`;
        const { allowed, remaining, resetAt } = checkRateLimit(key, options.rateLimit.maxRequests, options.rateLimit.windowMs);
        if (!allowed) {
          return NextResponse.json(
            { error: "Too Many Requests", code: "RATE_LIMITED", retryAfter: Math.ceil((resetAt - Date.now()) / 1000) },
            { status: 429, headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) } }
          );
        }
        rateLimitResult = { remaining, resetAt };
      }

      // 6. Call handler
      const response = await handler(Object.assign(req, { authContext: authContext ?? undefined }));

      // 7. Rate limit headers on response
      if (rateLimitResult && options.rateLimit) {
        response.headers.set("X-RateLimit-Limit", String(options.rateLimit.maxRequests));
        response.headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining));
        response.headers.set("X-RateLimit-Reset", String(Math.ceil(rateLimitResult.resetAt / 1000)));
      }

      // 8. Audit logging (on success)
      if (authContext && options.auditAction && options.auditResourceType) {
        await auditLog({
          organizationId: authContext.organization.id,
          userId: authContext.user.id,
          action: options.auditAction,
          resourceType: options.auditResourceType,
          metadata: { method: req.method, path: req.nextUrl.pathname, duration: Date.now() - startTime, status: response.status },
          ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
          userAgent: req.headers.get("user-agent") || undefined,
          success: response.status < 400,
        });
      }

      return response;

    } catch (e) {
      // Audit logging (on error)
      if (authContext && options.auditAction && options.auditResourceType) {
        await auditLog({
          organizationId: authContext.organization.id,
          userId: authContext.user.id,
          action: options.auditAction,
          resourceType: options.auditResourceType,
          metadata: { method: req.method, path: req.nextUrl.pathname, duration: Date.now() - startTime },
          ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
          userAgent: req.headers.get("user-agent") || undefined,
          success: false,
          errorMessage: e instanceof Error ? e.message : String(e),
        });
      }

      if (e instanceof ValidationError) {
        return NextResponse.json(
          { error: "Validation failed", code: "VALIDATION_ERROR", details: e.fieldErrors },
          { status: 400 }
        );
      }

      if (e instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation failed", code: "VALIDATION_ERROR", details: e.flatten().fieldErrors },
          { status: 400 }
        );
      }

      console.error("API Error:", e);
      return NextResponse.json(
        { error: "Internal Server Error", code: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }
  };
}

// ============================================================================
// Convenience wrapper
// ============================================================================

export function withAuth(
  options: MiddlewareOptions,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withMiddleware(handler, { ...options });
}