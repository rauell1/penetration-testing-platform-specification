// ============================================================================
// Auth Core - Session management, RBAC, rate limiting, audit logging
// ============================================================================

import { cookies } from "next/headers";
import { db } from "@/db";
import { users, organizations, memberships, auditLogs, usageCounters } from "@/db/schema";
import { eq, and, sql, gte, isNull } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";

// ============================================================================
// Types
// ============================================================================

export interface AuthContext {
  user: typeof users.$inferSelect;
  organization: typeof organizations.$inferSelect;
  membership: typeof memberships.$inferSelect;
}

export interface JWTPayload {
  userId: string;
  organizationId: string;
  membershipId: string;
  role: string;
  iat: number;
  exp: number;
}

// ============================================================================
// Constants
// ============================================================================

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

const ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days

export const ROLE_HIERARCHY = {
  viewer: 10,
  auditor: 20,
  engineer: 30,
  security_lead: 40,
  admin: 50,
  owner: 100,
} as const;

export type Role = keyof typeof ROLE_HIERARCHY;

// ============================================================================
// JWT Helpers
// ============================================================================

export async function createAccessToken(payload: Omit<JWTPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL}s`)
    .sign(JWT_SECRET);
}

export async function createRefreshToken(payload: Omit<JWTPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT({ ...payload, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL}s`)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// ============================================================================
// Session Management
// ============================================================================

export async function getAuthContext(req: Request): Promise<AuthContext | null> {
  // Try cookie first (server components)
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("aegis_access")?.value;

  // Try Authorization header (API routes)
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const token = accessToken || bearerToken;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  // Verify user, org, membership still exist and are active
  const [membership] = await db
    .select({
      user: users,
      organization: organizations,
      membership: memberships,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(
      and(
        eq(memberships.id, payload.membershipId),
        eq(users.id, payload.userId),
        eq(organizations.id, payload.organizationId),
        isNull(users.deletedAt),
        isNull(organizations.deletedAt),
        eq(organizations.emergencyStop, false)
      )
    )
    .limit(1);

  if (!membership) return null;

  return membership;
}

// ============================================================================
// Rate Limiting (in-memory with periodic cleanup)
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const CLEANUP_INTERVAL = 60_000; // 1 minute

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) rateLimitStore.delete(key);
  }
}, CLEANUP_INTERVAL);

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt };
}

// ============================================================================
// Audit Logging
// ============================================================================

export async function auditLog(params: {
  organizationId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      organizationId: params.organizationId,
      actorUserId: params.userId,
      action: params.action as any, // audit action enum
      targetType: params.resourceType,
      targetId: params.resourceId,
      ip: params.ipAddress,
      userAgent: params.userAgent,
      payload: {
        ...params.metadata,
        errorMessage: params.errorMessage,
      },
      // createdAt defaults to now()
    });
  } catch (e) {
    // Never throw on audit log failure
    console.error("Audit log failed:", e);
  }
}

// ============================================================================
// Usage Counters (for quota enforcement)
// ============================================================================

export async function checkAndIncrementUsage(
  organizationId: string,
  period: string,
  metric: "monthly_scans" | "concurrent_scans",
  limit: number
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const [counter] = await db
    .select()
    .from(usageCounters)
    .where(
      and(
        eq(usageCounters.organizationId, organizationId),
        eq(usageCounters.period, period),
        eq(usageCounters.metric, metric)
      )
    )
    .limit(1);

  const current = counter?.value ?? 0;
  if (current >= limit) {
    return { allowed: false, current, limit };
  }

  await db
    .insert(usageCounters)
    .values({
      organizationId,
      period,
      metric,
      value: counter ? current + 1 : 1,
    })
    .onConflictDoUpdate({
      target: [usageCounters.organizationId, usageCounters.period, usageCounters.metric],
      set: { value: counter ? current + 1 : 1, updatedAt: new Date() },
    });

  return { allowed: true, current: current + 1, limit };
}

export async function decrementUsage(
  organizationId: string,
  period: string,
  metric: "concurrent_scans"
): Promise<void> {
  await db
    .update(usageCounters)
    .set({ value: sql`${usageCounters.value} - 1`, updatedAt: new Date() })
    .where(
      and(
        eq(usageCounters.organizationId, organizationId),
        eq(usageCounters.period, period),
        eq(usageCounters.metric, metric)
      )
    );
}

// ============================================================================
// Permission helpers
// ============================================================================

export function canAccess(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function canManageOrganization(userRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY.admin;
}

export function canLaunchActiveScans(userRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY.security_lead;
}

export function canViewAuditLogs(userRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY.auditor;
}

// ============================================================================
// Password hashing
// ============================================================================

import { hash, verify } from "@node-rs/argon2";

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await verify(hash, password);
  } catch {
    return false;
  }
}