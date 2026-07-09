import { sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  findingInstances,
  findings,
  scanRuns,
  targets,
} from "@/db/schema";
import Shell, { PageHeader, SectionCard } from "@/components/Shell";
import { Pill, RunStatusBadge, SeverityChip, Stat } from "@/components/atoms";
import type { ScanRunStatus, Severity } from "@/domain/types";

export const dynamic = "force-dynamic";

export default async function ScanRunDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [r] = await db.select().from(scanRuns).where(sql`id = ${id}`);
  if (!r) notFound();
  const [t] = await db
    .select()
    .from(targets)
    .where(sql`id = ${r.targetId}`);
  const instances = await db
    .select()
    .from(findingInstances)
    .where(sql`scan_run_id = ${id}`);
  const findingIds = Array.from(new Set(instances.map((i) => i.findingId)));
  const findingsList =
    findingIds.length > 0
      ? await db
          .select()
          .from(findings)
          .where(sql`id = ANY(${sql`ARRAY[${sql.join(findingIds.map((x) => sql`${x}::uuid`), sql`, `)}]`})`)
      : [];

  const stats = r.stats as {
    pages?: number;
    requests?: number;
    findings?: number;
  };
  const bySev = findingsList.reduce(
    (acc, f) => {
      acc[f.severity as Severity] = (acc[f.severity as Severity] ?? 0) + 1;
      return acc;
    },
    { info: 0, low: 0, medium: 0, high: 0, critical: 0 } as Record<Severity, number>,
  );

  return (
    <Shell activePath="/scans">
      <PageHeader
        eyebrow={`Scan run · ${t?.label ?? ""}`}
        title={r.id.slice(0, 8)}
        description={`Launched ${new Date(r.createdAt).toLocaleString()}`}
        actions={
          <>
            <RunStatusBadge status={r.status as ScanRunStatus} />
            <Link
              href="/scans"
              className="rounded-md border border-zinc-700 hover:border-zinc-500 text-zinc-200 px-3.5 py-2 text-sm"
            >
              ← All runs
            </Link>
          </>
        }
      />
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Pages crawled" value={stats?.pages ?? "—"} />
          <Stat label="Requests sent" value={stats?.requests ?? "—"} />
          <Stat label="Findings" value={findingsList.length} />
          <Stat
            label="Critical + high"
            value={bySev.critical + bySev.high}
            tone={bySev.critical + bySev.high > 0 ? "danger" : "good"}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <SectionCard title="Immutable scope snapshot" eyebrow="Captured at launch">
            <pre className="text-[11px] leading-relaxed overflow-x-auto max-h-80">
              {JSON.stringify(r.scopeSnapshot, null, 2)}
            </pre>
          </SectionCard>
          <SectionCard title="Policy decision" eyebrow="Preflight result">
            <pre className="text-[11px] leading-relaxed overflow-x-auto max-h-80">
              {JSON.stringify(r.policyDecision, null, 2)}
            </pre>
          </SectionCard>
        </div>

        <SectionCard title="Findings from this run">
          {findingsList.length === 0 ? (
            <p className="text-sm text-zinc-400">No findings.</p>
          ) : (
            <ul className="space-y-2">
              {findingsList
                .sort(
                  (a, b) =>
                    sevRank(b.severity as Severity) -
                    sevRank(a.severity as Severity),
                )
                .map((f) => {
                  const inst = instances.find((i) => i.findingId === f.id);
                  return (
                    <li
                      key={f.id}
                      className="flex items-center gap-3 border-b border-zinc-800/60 pb-2 last:border-0"
                    >
                      <SeverityChip severity={f.severity as Severity} />
                      <Link
                        href={`/findings/${f.id}`}
                        className="text-zinc-200 hover:text-emerald-400 text-sm flex-1 min-w-0 truncate"
                      >
                        {f.title}
                      </Link>
                      <Pill tone="slate">{f.category}</Pill>
                      {inst?.path && (
                        <code className="text-xs text-zinc-500 hidden md:inline">
                          {inst.method} {inst.path}
                        </code>
                      )}
                    </li>
                  );
                })}
            </ul>
          )}
        </SectionCard>
      </div>
    </Shell>
  );
}

function sevRank(s: Severity): number {
  return { info: 0, low: 1, medium: 2, high: 3, critical: 4 }[s];
}
