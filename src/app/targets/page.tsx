import { sql } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import {
  targetVerifications,
  targets,
} from "@/db/schema";
import Shell, { PageHeader, SectionCard } from "@/components/Shell";
import { Pill } from "@/components/atoms";
import { requireAuth } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function TargetsPage() {
  const { organization: org } = await requireAuth();

  const rows = await db
    .select()
    .from(targets)
    .where(sql`organization_id = ${org.id}`);

  const verifications = await db
    .select()
    .from(targetVerifications)
    .where(sql`organization_id = ${org.id}`);

  return (
    <Shell activePath="/targets">
      <PageHeader
        eyebrow="Targets"
        title="Registered targets"
        description="Each target must be verified before any scan (passive or active) will pass the policy preflight. Active scanning requires a second explicit opt-in per target."
      />
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8 space-y-6">
        {rows.map((t) => {
          const v = verifications.find((v) => v.targetId === t.id);
          return (
            <SectionCard key={t.id} title={t.label}>
              <div className="grid md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-2">
                  <Row label="Primary host">
                    <code className="text-emerald-400">{t.primaryHost}</code>
                  </Row>
                  <Row label="Base URL">
                    <code className="text-zinc-300">{t.baseUrl}</code>
                  </Row>
                  <Row label="Kind">
                    <Pill tone="sky">{t.kind}</Pill>
                  </Row>
                  <Row label="Active scans">
                    {t.activeScansEnabled ? (
                      <Pill tone="amber">enabled</Pill>
                    ) : (
                      <Pill tone="slate">passive-only</Pill>
                    )}
                  </Row>
                  {t.description && (
                    <Row label="Description">
                      <span className="text-zinc-300">{t.description}</span>
                    </Row>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                    Ownership verification
                  </div>
                  {v ? (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Pill tone="emerald">
                          {v.status === "verified" ? "verified" : v.status}
                        </Pill>
                        <span className="text-xs text-zinc-400">
                          {v.type.replace("_", " ")}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-zinc-300 break-all">
                        {v.challenge}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-2">
                        Verified{" "}
                        {v.verifiedAt
                          ? new Date(v.verifiedAt).toLocaleDateString()
                          : "—"}{" "}
                        · expires{" "}
                        {v.expiresAt
                          ? new Date(v.expiresAt).toLocaleDateString()
                          : "—"}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-rose-200 text-sm">
                      Not verified — scans blocked at preflight.
                    </div>
                  )}
                  <Link
                    href={`/targets/${t.id}`}
                    className="inline-block text-xs text-emerald-400 hover:underline mt-1"
                  >
                    Open target detail →
                  </Link>
                </div>
              </div>
            </SectionCard>
          );
        })}
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
      <div className="w-28 shrink-0 text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
        {label}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
