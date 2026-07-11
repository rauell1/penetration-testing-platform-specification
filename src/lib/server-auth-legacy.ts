import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, organizations, memberships } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { verifyToken, type AuthContext } from "./auth";

/**
 * Legacy JWT auth — used only if Neon Auth is not configured.
 */
export async function requireAuth(): Promise<AuthContext> {
  const cookieStore = await cookies();
  const token = cookieStore.get("aegis_access")?.value;
  if (!token) redirect("/auth/login");

  const payload = await verifyToken(token);
  if (!payload) redirect("/auth/login");

  const [result] = await db
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

  if (!result) redirect("/auth/login");
  return result;
}