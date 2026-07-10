import { sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import Shell, { PageHeader, SectionCard } from "@/components/Shell";
import { requireAuth } from "@/lib/server-auth";
import { AuditTable } from "./AuditTable";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const { organization: org } = await requireAuth();
  const rows = await db
    .select()
    .from(auditLogs)
    .where(sql`organization_id = ${org.id}`)
    .orderBy(sql`created_at desc`)
    .limit(200);

  return (
    <Shell activePath="/audit">
      <PageHeader
        eyebrow="Audit log"
        title="Immutable action history"
        description="Every meaningful action (target creation, verification, scan launch, kill switch, finding transition, report export) writes a row here. In production these rows are INSERT-only; UPDATE is denied at the DB grant level."
      />
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8">
        <SectionCard>
          <AuditTable rows={rows} />
        </SectionCard>
      </div>
    </Shell>
  );
}
