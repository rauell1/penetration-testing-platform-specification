import { sql } from "drizzle-orm";
import { db } from "@/db";
import { findings } from "@/db/schema";
import Shell, { PageHeader, SectionCard } from "@/components/Shell";
import { requireAuth } from "@/lib/server-auth";
import { FindingsTable } from "./FindingsTable";
import type { Severity } from "@/domain/types";

export const dynamic = "force-dynamic";

export default async function FindingsPage() {
  const { organization: org } = await requireAuth();
  const rows = await db
    .select()
    .from(findings)
    .where(sql`organization_id = ${org.id}`)
    .orderBy(sql`last_seen_at desc`);

  const sorted = rows.sort(
    (a, b) =>
      sevRank(b.severity as Severity) - sevRank(a.severity as Severity),
  );

  return (
    <Shell activePath="/findings">
      <PageHeader
        eyebrow="Findings"
        title="All findings"
        description="Normalized across every scanner and scan run. Each row is a canonical Finding with a stable fingerprint; multiple scanner instances collapse into one row automatically."
      />
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8">
        <SectionCard>
          <FindingsTable rows={sorted} />
        </SectionCard>
      </div>
    </Shell>
  );
}

function sevRank(s: Severity): number {
  return { info: 0, low: 1, medium: 2, high: 3, critical: 4 }[s];
}
