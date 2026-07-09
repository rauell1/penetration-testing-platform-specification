import { sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { findings, organizations } from "@/db/schema";
import Shell, { PageHeader, SectionCard } from "@/components/Shell";
import { Pill, SeverityChip, StateBadge } from "@/components/atoms";
import type { FindingState, Severity } from "@/domain/types";

export const dynamic = "force-dynamic";

export default async function FindingsPage() {
  const [org] = await db.select().from(organizations).limit(1);
  if (!org)
    return (
      <Shell activePath="/findings">
        <PageHeader title="No org yet" />
      </Shell>
    );
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
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="text-left px-5 py-2">Sev</th>
                  <th className="text-left px-5 py-2">Title</th>
                  <th className="text-left px-5 py-2">Category</th>
                  <th className="text-left px-5 py-2">WSTG</th>
                  <th className="text-left px-5 py-2">State</th>
                  <th className="text-left px-5 py-2">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((f) => (
                  <tr
                    key={f.id}
                    className="border-t border-slate-800/60 hover:bg-slate-800/20"
                  >
                    <td className="px-5 py-2">
                      <SeverityChip severity={f.severity as Severity} />
                    </td>
                    <td className="px-5 py-2">
                      <Link
                        href={`/findings/${f.id}`}
                        className="text-slate-100 hover:text-sky-300"
                      >
                        {f.title}
                      </Link>
                    </td>
                    <td className="px-5 py-2">
                      <Pill tone="slate">{f.category}</Pill>
                    </td>
                    <td className="px-5 py-2 text-slate-400 font-mono text-xs">
                      {f.wstgId ?? "—"}
                    </td>
                    <td className="px-5 py-2">
                      <StateBadge state={f.state as FindingState} />
                    </td>
                    <td className="px-5 py-2 text-slate-500 text-xs">
                      {new Date(f.lastSeenAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </Shell>
  );
}

function sevRank(s: Severity): number {
  return { info: 0, low: 1, medium: 2, high: 3, critical: 4 }[s];
}
