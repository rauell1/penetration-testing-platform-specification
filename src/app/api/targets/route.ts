import { sql } from "drizzle-orm";
import { db } from "@/db";
import { targets } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get("organizationId");
  if (!orgId) {
    return Response.json(
      { error: "organizationId required" },
      { status: 400 },
    );
  }
  const rows = await db
    .select()
    .from(targets)
    .where(sql`organization_id = ${orgId}`);
  return Response.json({ targets: rows });
}
