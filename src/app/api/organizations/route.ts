import { db } from "@/db";
import { organizations } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(organizations);
  return Response.json({ organizations: rows });
}
