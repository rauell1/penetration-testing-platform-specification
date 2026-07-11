import { neonAuth, isNeonAuthEnabled } from "./auth/server";
import { requireAuth as requireLegacyAuth } from "./server-auth-legacy";
import { redirect } from "next/navigation";

/**
 * Unified auth entry point for server components.
 * Uses Neon Auth when configured; falls back to legacy JWT.
 */
export async function requireAuth() {
  if (isNeonAuthEnabled && neonAuth) {
    const { data: session } = await neonAuth.getSession();
    if (!session?.user) redirect("/auth/login");

    // Fetch org + membership from our schema (Neon Auth stores users in neon_auth schema)
    // This is a minimal bridge until full migration.
    const { db } = await import("@/db");
    const { users, organizations, memberships } = await import("@/db/schema");
    const { eq, and, isNull } = await import("drizzle-orm");

    const [result] = await db
      .select({
        user: users,
        organization: organizations,
        membership: memberships,
      })
      .from(memberships)
      .innerJoin(users, eq(users.email, session.user.email))
      .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
      .where(
        and(
          eq(users.email, session.user.email),
          isNull(users.deletedAt),
          isNull(organizations.deletedAt),
          eq(organizations.emergencyStop, false)
        )
      )
      .limit(1);

    if (!result) redirect("/auth/login");
    return result;
  }

  // Legacy path
  return requireLegacyAuth();
}