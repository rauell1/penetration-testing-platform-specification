import { sql } from "drizzle-orm";
import { db } from "@/db";
import { organizations, scanRuns, targets } from "@/db/schema";
import Shell, { PageHeader, SectionCard } from "@/components/Shell";
import { ScansTable } from "./ScansTable";

export const dynamic = "force-dynamic";

export default async function ScansPage() {
  const [org] = await db.select().from(organizations).limit(1);
  if (!org)
    return (
      <Shell activePath="/scans">
        <PageHeader title="No org yet" />
      </Shell>
    );
  const runs = await db
    .select()
    .from(scanRuns)
    .where(sql`organization_id = ${org.id}`)
    .orderBy(sql`created_at desc`);
  const targetsList = await db
    .select()
    .from(targets)
    .where(sql`organization_id = ${org.id}`);
  const targetMap = new Map(targetsList.map((t) => [t.id, t]));

  const rows = runs.map((r) => {
    const t = targetMap.get(r.targetId);
    const stats = r.stats as {
      pages?: number;
      requests?: number;
      findings?: number;
    };
    return {
      id: r.id,
      targetLabel: t?.label ?? null,
      status: r.status,
      pages: stats?.pages ?? null,
      requests: stats?.requests ?? null,
      findings: stats?.findings ?? null,
      finishedAt: r.finishedAt,
    };
  });

  return (
    <Shell activePath="/scans">
      <PageHeader
        eyebrow="Scan runs"
        title="Scan history"
        description="Every scan carries an immutable snapshot of the scope, profile, and policy decision that authorized it. Nothing here can be silently mutated."
      />
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8">
        <SectionCard>
          <ScansTable rows={rows} />
        </SectionCard>
      </div>
    </Shell>
  );
}
