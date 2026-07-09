import Link from "next/link";
import Shell, { PageHeader, SectionCard } from "@/components/Shell";
import { SPEC_SECTIONS } from "@/spec/content";

export default function SpecIndex() {
  return (
    <Shell activePath="/spec">
      <PageHeader
        eyebrow="Blueprint"
        title="SentinelDAST implementation blueprint"
        description="A staff-plus, implementation-grade specification for a real SaaS penetration-testing platform. The Drizzle schema, policy engine, scope engine, and fingerprint/normalizer modules in this repo are the reference implementations of the sections below."
      />
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8 grid md:grid-cols-2 gap-4">
        {SPEC_SECTIONS.map((s) => (
          <Link
            key={s.slug}
            href={`/spec/${s.slug}`}
            className="group block rounded-xl border border-zinc-800 hover:border-emerald-500/50 bg-zinc-900/40 backdrop-blur p-5 transition"
          >
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-xl font-black text-emerald-400/70 group-hover:text-emerald-300">
                {s.number}
              </span>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-emerald-400/80 font-semibold">
                  {s.eyebrow}
                </div>
                <div className="text-zinc-100 font-semibold group-hover:text-white">
                  {s.title}
                </div>
              </div>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {s.summary}
            </p>
          </Link>
        ))}
      </div>
      <div className="max-w-6xl mx-auto px-6 lg:px-10 pb-12">
        <SectionCard
          eyebrow="Also included"
          title="What lives in this repo, and where"
        >
          <ul className="grid md:grid-cols-2 gap-x-8 gap-y-1 text-sm text-zinc-300">
            <li>
              <code>src/db/schema.ts</code> — full Drizzle schema
            </li>
            <li>
              <code>src/db/seed.ts</code> — idempotent demo seed
            </li>
            <li>
              <code>src/domain/types.ts</code> — TS domain model
            </li>
            <li>
              <code>src/domain/scope.ts</code> — scope engine + SSRF hard-block
            </li>
            <li>
              <code>src/domain/policy.ts</code> — <code>decidePolicy()</code>
            </li>
            <li>
              <code>src/domain/fingerprint.ts</code> — dedup fingerprint +
              merge
            </li>
            <li>
              <code>src/app/api/policy/preview</code> — POST it to see a policy
              decision + scope check
            </li>
            <li>
              <code>src/app/dashboard, /targets, /scans, /findings</code> —
              live pages
            </li>
          </ul>
        </SectionCard>
      </div>
    </Shell>
  );
}
