import { sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { findingInstances, findings, targets } from "@/db/schema";
import Shell, { PageHeader, SectionCard } from "@/components/Shell";
import { Pill, SeverityChip, StateBadge } from "@/components/atoms";
import type { FindingState, Severity } from "@/domain/types";

export const dynamic = "force-dynamic";

export default async function FindingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [f] = await db.select().from(findings).where(sql`id = ${id}`);
  if (!f) notFound();
  const [t] = await db.select().from(targets).where(sql`id = ${f.targetId}`);
  const instances = await db
    .select()
    .from(findingInstances)
    .where(sql`finding_id = ${id}`);

  return (
    <Shell activePath="/findings">
      <PageHeader
        eyebrow={t?.label ?? "Finding"}
        title={f.title}
        description={f.summary}
        actions={
          <>
            <SeverityChip severity={f.severity as Severity} />
            <StateBadge state={f.state as FindingState} />
            <Link
              href="/findings"
              className="rounded-md border border-slate-700 hover:border-slate-500 text-slate-200 px-3.5 py-2 text-sm"
            >
              ← All findings
            </Link>
          </>
        }
      />
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SectionCard title="Remediation">
            <p className="text-sm text-slate-300 leading-relaxed">
              {f.remediation ?? "—"}
            </p>
          </SectionCard>

          <SectionCard title={`Instances across scan runs (${instances.length})`}>
            <ul className="space-y-3">
              {instances.map((i) => (
                <li
                  key={i.id}
                  className="border-b border-slate-800/60 pb-3 last:border-0 last:pb-0 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Pill tone="violet">{i.scannerProvenance}</Pill>
                    <code className="text-xs text-slate-400">
                      {i.method} {i.host}
                      {i.path}
                    </code>
                    {i.parameter && (
                      <span className="text-xs text-amber-300">
                        param: <code>{i.parameter}</code>
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Seen in run{" "}
                    <Link
                      href={`/scans/${i.scanRunId}`}
                      className="text-sky-400 hover:underline font-mono"
                    >
                      {i.scanRunId.slice(0, 8)}
                    </Link>{" "}
                    at {new Date(i.createdAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Fingerprint" eyebrow="Stable dedup key">
            <code className="text-xs text-sky-300 break-all">{f.fingerprint}</code>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              This fingerprint stays constant across scanner adapters and across
              scan runs. Two adapters that both flag this issue produce two
              <em> instances</em> under one <em>finding</em>. When a later run
              stops seeing this issue, its <code>lastSeenAt</code> stops
              advancing and the resolution workflow triggers.
            </p>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Classification">
            <dl className="text-sm space-y-2">
              <Row label="Category">
                <Pill tone="slate">{f.category}</Pill>
              </Row>
              <Row label="WSTG">
                <code className="text-slate-300">{f.wstgId ?? "—"}</code>
              </Row>
              <Row label="CWE">
                <code className="text-slate-300">{f.cwe ?? "—"}</code>
              </Row>
              <Row label="Confidence">
                <Pill
                  tone={
                    f.confidence === "certain"
                      ? "emerald"
                      : f.confidence === "firm"
                        ? "sky"
                        : "amber"
                  }
                >
                  {f.confidence}
                </Pill>
              </Row>
              <Row label="First seen">
                <span className="text-slate-300 text-xs">
                  {new Date(f.firstSeenAt).toLocaleDateString()}
                </span>
              </Row>
              <Row label="Last seen">
                <span className="text-slate-300 text-xs">
                  {new Date(f.lastSeenAt).toLocaleDateString()}
                </span>
              </Row>
            </dl>
          </SectionCard>
          <SectionCard title="References">
            {(f.references as string[]).length === 0 ? (
              <p className="text-xs text-slate-500">None.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {(f.references as string[]).map((r) => (
                  <li key={r}>
                    <a
                      href={r}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sky-400 hover:underline break-all"
                    >
                      {r}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </Shell>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 items-baseline">
      <div className="w-24 shrink-0 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
        {label}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
