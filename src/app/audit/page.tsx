import { sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, organizations } from "@/db/schema";
import Shell, { PageHeader, SectionCard } from "@/components/Shell";
import { Pill } from "@/components/atoms";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const [org] = await db.select().from(organizations).limit(1);
  if (!org)
    return (
      <Shell activePath="/audit">
        <PageHeader title="No org yet" />
      </Shell>
    );
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
          <ul className="divide-y divide-zinc-800/60">
            {rows.map((r) => (
               <li
                key={r.id}
                className="py-3 flex items-center gap-3 text-sm"
              >
                <Pill tone={toneFor(r.action)}>{r.action}</Pill>
                {r.targetType && (
                  <span className="text-zinc-400 text-xs">
                    {r.targetType}:{" "}
                    <code>{r.targetId?.slice(0, 8) ?? "—"}</code>
                  </span>
                )}
                <span className="ml-auto text-[11px] text-zinc-500 tabular-nums">
                  {new Date(r.createdAt).toISOString().replace("T", " ").slice(0, 19)}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </Shell>
  );
}

function toneFor(action: string): "sky" | "amber" | "rose" | "emerald" | "slate" | "violet" {
  if (action.startsWith("scan.kill")) return "rose";
  if (action.startsWith("scan.")) return "sky";
  if (action.startsWith("target.verify")) return "emerald";
  if (action.startsWith("finding.")) return "violet";
  if (action.startsWith("policy.")) return "amber";
  return "slate";
}
