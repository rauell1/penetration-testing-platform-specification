import { sql } from "drizzle-orm";
import { db } from "@/db";
import { findings } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get("organizationId");
  const severity = url.searchParams.get("severity");
  if (!orgId) {
    return Response.json(
      { error: "organizationId required" },
      { status: 400 },
    );
  }
  const where = severity
    ? sql`organization_id = ${orgId} AND severity = ${severity}`
    : sql`organization_id = ${orgId}`;
  const rows = await db.select().from(findings).where(where);
  return Response.json({ findings: rows });
}
