import { sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import {
  findings,
  organizations,
  scanRuns,
  targets,
} from "@/db/schema";
import Shell, { PageHeader, SectionCard } from "@/components/Shell";
import { Pill, RunStatusBadge, SeverityChip, Stat } from "@/components/atoms";
import type { Severity, ScanRunStatus } from "@/domain/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [org] = await db.select().from(organizations).limit(1);
  if (!org) {
    return (
      <Shell activePath="/dashboard">
        <PageHeader
          eyebrow="Dashboard"
          title="No data yet"
          description="Run the seed to populate the demo organization."
        />
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
          <SectionCard>
            <pre>npx tsx src/db/seed.ts</pre>
          </SectionCard>
        </div>
      </Shell>
    );
  }

  const targetsList = await db
    .select()
    .from(targets)
    .where(sql`organization_id = ${org.id}`);

  const runsList = await db
    .select()
    .from(scanRuns)
    .where(sql`organization_id = ${org.id}`)
    .orderBy(sql`created_at desc`)
    .limit(5);

  const findingsList = await db
    .select()
    .from(findings)
    .where(sql`organization_id = ${org.id}`);

  const bySeverity = findingsList.reduce(
    (acc, f) => {
      acc[f.severity as Severity] = (acc[f.severity as Severity] ?? 0) + 1;
      return acc;
    },
    { info: 0, low: 0, medium: 0, high: 0, critical: 0 } as Record<Severity, number>,
  );

  const openCount = findingsList.filter(
    (f) => f.state !== "resolved" && f.state !== "false_positive" && f.state !== "wont_fix",
  ).length;

  return (
    <Shell activePath="/dashboard">
      <PageHeader
        eyebrow={`Organization · ${org.name}`}
        title="Security posture overview"
        description="Aggregated view of targets, recent scan activity, and finding severity distribution for the current organization."
        actions={
          <>
            <Link
              href="/scans"
              className="rounded-md border border-slate-700 hover:border-slate-500 text-slate-200 px-3.5 py-2 text-sm"
            >
              All scan runs
            </Link>
            <Link
              href="/findings"
              className="rounded-md bg-sky-500 hover:bg-sky-400 text-slate-900 font-semibold px-3.5 py-2 text-sm"
            >
              Browse findings →
            </Link>
          </>
        }
      />
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Stat label="Targets" value={targetsList.length} hint="verified + registered" />
          <Stat label="Recent scans" value={runsList.length} hint="last 5 runs" />
          <Stat
            label="Open findings"
            value={openCount}
            hint="excludes resolved / FP / won't-fix"
            tone={openCount > 5 ? "warn" : "default"}
          />
          <Stat
            label="Critical"
            value={bySeverity.critical}
            tone={bySeverity.critical > 0 ? "danger" : "good"}
          />
          <Stat
            label="High"
            value={bySeverity.high}
            tone={bySeverity.high > 0 ? "warn" : "good"}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <SectionCard title="Severity distribution" className="lg:col-span-2">
            <div className="space-y-2">
              {(["critical", "high", "medium", "low", "info"] as Severity[]).map((s) => {
                const count = bySeverity[s];
                const max = Math.max(1, ...Object.values(bySeverity));
                const width = (count / max) * 100;
                return (
                  <div key={s} className="flex items-center gap-3 text-sm">
                    <div className="w-20">
                      <SeverityChip severity={s} />
                    </div>
                    <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full ${barColor(s)}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <div className="w-8 text-right text-slate-400 tabular-nums">
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Recent scan runs">
            {runsList.length === 0 && (
              <p className="text-sm text-slate-400">No scans yet.</p>
            )}
            <ul className="space-y-3">
              {runsList.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 text-sm border-b border-slate-800/60 pb-3 last:border-0 last:pb-0"
                >
                  <RunStatusBadge status={r.status as ScanRunStatus} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/scans/${r.id}`}
                      className="text-slate-200 hover:text-sky-300 truncate block"
                    >
                      {r.id.slice(0, 8)}
                    </Link>
                    <div className="text-[11px] text-slate-500">
                      {r.finishedAt
                        ? new Date(r.finishedAt).toLocaleString()
                        : "in progress"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <SectionCard title="Targets in this org">
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="text-left px-5 py-2">Label</th>
                  <th className="text-left px-5 py-2">Host</th>
                  <th className="text-left px-5 py-2">Kind</th>
                  <th className="text-left px-5 py-2">Active scans</th>
                  <th className="text-left px-5 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {targetsList.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t border-slate-800/60 hover:bg-slate-800/20"
                  >
                    <td className="px-5 py-2">
                      <Link
                        href={`/targets/${t.id}`}
                        className="text-slate-200 hover:text-sky-300"
                      >
                        {t.label}
                      </Link>
                    </td>
                    <td className="px-5 py-2 text-slate-400 font-mono text-xs">
                      {t.primaryHost}
                    </td>
                    <td className="px-5 py-2">
                      <Pill tone="sky">{t.kind}</Pill>
                    </td>
                    <td className="px-5 py-2">
                      {t.activeScansEnabled ? (
                        <Pill tone="amber">enabled</Pill>
                      ) : (
                        <Pill tone="slate">passive-only</Pill>
                      )}
                    </td>
                    <td className="px-5 py-2 text-slate-500 text-xs">
                      {new Date(t.createdAt).toLocaleDateString()}
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

function barColor(s: Severity): string {
  switch (s) {
    case "critical":
      return "bg-rose-500";
    case "high":
      return "bg-orange-500";
    case "medium":
      return "bg-amber-500";
    case "low":
      return "bg-emerald-500";
    default:
      return "bg-slate-600";
  }
}
