import { sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  scanRuns,
  scopeRules,
  scopes,
  targetVerifications,
  targets,
} from "@/db/schema";
import Shell, { PageHeader, SectionCard } from "@/components/Shell";
import { Pill, RunStatusBadge } from "@/components/atoms";
import type { ScanRunStatus } from "@/domain/types";

export const dynamic = "force-dynamic";

export default async function TargetDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [t] = await db.select().from(targets).where(sql`id = ${id}`);
  if (!t) notFound();

  const [v] = await db
    .select()
    .from(targetVerifications)
    .where(sql`target_id = ${id}`);
  const scopeRows = await db
    .select()
    .from(scopes)
    .where(sql`target_id = ${id}`);
  const scopeRuleRows =
    scopeRows.length > 0
      ? await db
          .select()
          .from(scopeRules)
          .where(sql`scope_id = ${scopeRows[0].id}`)
      : [];
  const runs = await db
    .select()
    .from(scanRuns)
    .where(sql`target_id = ${id}`)
    .orderBy(sql`created_at desc`);

  return (
    <Shell activePath="/targets">
      <PageHeader
        eyebrow="Target"
        title={t.label}
        description={t.baseUrl}
        actions={
          <Link
            href="/targets"
            className="rounded-md border border-slate-700 hover:border-slate-500 text-slate-200 px-3.5 py-2 text-sm"
          >
            ← All targets
          </Link>
        }
      />
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Scope" eyebrow="Enforced in every worker">
            {scopeRows.length === 0 ? (
              <p className="text-sm text-slate-400">No scope defined.</p>
            ) : (
              <div className="space-y-3">
                <div className="text-sm">
                  <span className="text-slate-400">Scope: </span>
                  <span className="text-slate-200 font-medium">
                    {scopeRows[0].name}
                  </span>
                  {scopeRows[0].isDefault && (
                    <Pill tone="sky">
                      <span className="ml-2">default</span>
                    </Pill>
                  )}
                </div>
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="text-left py-2">Type</th>
                      <th className="text-left py-2">Pattern</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scopeRuleRows.map((r) => (
                      <tr key={r.id} className="border-t border-slate-800/60">
                        <td className="py-2">
                          <Pill
                            tone={
                              r.type.startsWith("allow")
                                ? "emerald"
                                : r.type.startsWith("deny")
                                  ? "rose"
                                  : "sky"
                            }
                          >
                            {r.type}
                          </Pill>
                        </td>
                        <td className="py-2 font-mono text-xs text-slate-300">
                          {r.pattern}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Scan history">
            {runs.length === 0 ? (
              <p className="text-sm text-slate-400">No scans yet.</p>
            ) : (
              <ul className="space-y-3">
                {runs.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 text-sm border-b border-slate-800/60 pb-3 last:border-0 last:pb-0"
                  >
                    <RunStatusBadge status={r.status as ScanRunStatus} />
                    <Link
                      href={`/scans/${r.id}`}
                      className="text-slate-200 hover:text-sky-300 font-mono text-xs"
                    >
                      {r.id.slice(0, 8)}
                    </Link>
                    <span className="text-slate-500 text-xs">
                      {r.finishedAt
                        ? new Date(r.finishedAt).toLocaleString()
                        : "—"}
                    </span>
                    <span className="ml-auto text-slate-400 text-xs">
                      {(r.stats as { findings?: number })?.findings ?? 0}{" "}
                      findings
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Verification">
            {v ? (
              <div className="text-sm">
                <div className="mb-2">
                  <Pill tone={v.status === "verified" ? "emerald" : "amber"}>
                    {v.status}
                  </Pill>{" "}
                  <span className="text-slate-400 text-xs">
                    ({v.type.replace("_", " ")})
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-300 break-all mb-2">
                  {v.challenge}
                </div>
                <div className="text-[11px] text-slate-500">
                  Verified{" "}
                  {v.verifiedAt
                    ? new Date(v.verifiedAt).toLocaleDateString()
                    : "—"}
                </div>
                <div className="text-[11px] text-slate-500">
                  Expires{" "}
                  {v.expiresAt
                    ? new Date(v.expiresAt).toLocaleDateString()
                    : "—"}
                </div>
              </div>
            ) : (
              <p className="text-sm text-rose-300">Not verified.</p>
            )}
          </SectionCard>
          <SectionCard title="Metadata">
            <dl className="text-sm space-y-2">
              <div>
                <dt className="text-[10px] uppercase text-slate-500">Kind</dt>
                <dd className="text-slate-200">{t.kind}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase text-slate-500">
                  Active scans
                </dt>
                <dd>
                  {t.activeScansEnabled ? (
                    <Pill tone="amber">enabled</Pill>
                  ) : (
                    <Pill tone="slate">passive-only</Pill>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase text-slate-500">
                  Created
                </dt>
                <dd className="text-slate-200 text-xs">
                  {new Date(t.createdAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </SectionCard>
        </div>
      </div>
    </Shell>
  );
}
