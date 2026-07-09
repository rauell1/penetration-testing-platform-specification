import { sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { organizations, scanRuns, targets } from "@/db/schema";
import Shell, { PageHeader, SectionCard } from "@/components/Shell";
import { RunStatusBadge } from "@/components/atoms";
import type { ScanRunStatus } from "@/domain/types";

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

  return (
    <Shell activePath="/scans">
      <PageHeader
        eyebrow="Scan runs"
        title="Scan history"
        description="Every scan carries an immutable snapshot of the scope, profile, and policy decision that authorized it. Nothing here can be silently mutated."
      />
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8">
        <SectionCard>
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="text-left px-5 py-2">Run</th>
                  <th className="text-left px-5 py-2">Target</th>
                  <th className="text-left px-5 py-2">Status</th>
                  <th className="text-right px-5 py-2">Pages</th>
                  <th className="text-right px-5 py-2">Requests</th>
                  <th className="text-right px-5 py-2">Findings</th>
                  <th className="text-left px-5 py-2">Finished</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => {
                  const t = targetMap.get(r.targetId);
                  const stats = r.stats as {
                    pages?: number;
                    requests?: number;
                    findings?: number;
                  };
                  return (
                    <tr
                      key={r.id}
                      className="border-t border-slate-800/60 hover:bg-slate-800/20"
                    >
                      <td className="px-5 py-2">
                        <Link
                          href={`/scans/${r.id}`}
                          className="text-sky-300 hover:underline font-mono text-xs"
                        >
                          {r.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-5 py-2 text-slate-300">
                        {t?.label ?? "—"}
                      </td>
                      <td className="px-5 py-2">
                        <RunStatusBadge status={r.status as ScanRunStatus} />
                      </td>
                      <td className="px-5 py-2 text-right tabular-nums text-slate-300">
                        {stats?.pages ?? "—"}
                      </td>
                      <td className="px-5 py-2 text-right tabular-nums text-slate-300">
                        {stats?.requests ?? "—"}
                      </td>
                      <td className="px-5 py-2 text-right tabular-nums text-slate-100 font-semibold">
                        {stats?.findings ?? "—"}
                      </td>
                      <td className="px-5 py-2 text-slate-500 text-xs">
                        {r.finishedAt
                          ? new Date(r.finishedAt).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </Shell>
  );
}
