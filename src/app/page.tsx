import Link from "next/link";
import Shell, { PageHeader, SectionCard } from "@/components/Shell";
import { Pill } from "@/components/atoms";

export default function HomePage() {
  return (
    <Shell activePath="/">
      <div className="bg-grid">
        <PageHeader
          eyebrow="Reference implementation + full blueprint"
          title="SentinelDAST — an authorized web-app pentest platform"
          description="A production-shaped design and working Next.js + Neon reference for a SaaS that lets teams register targets, prove ownership, then run passive and safely-controlled active security assessments against their own web apps and APIs, with OWASP WSTG-aligned findings."
          actions={
            <>
              <Link
                href="/dashboard"
                className="rounded-md bg-sky-500 hover:bg-sky-400 text-slate-900 font-semibold px-3.5 py-2 text-sm"
              >
                Open live dashboard →
              </Link>
              <Link
                href="/spec"
                className="rounded-md border border-slate-700 hover:border-slate-500 text-slate-200 px-3.5 py-2 text-sm"
              >
                Read the blueprint
              </Link>
            </>
          }
        />
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10 space-y-10">
          <div className="grid md:grid-cols-3 gap-4">
            <Feature
              tone="sky"
              title="Passive by default"
              body="Every scan starts read-only. Active checks require a verified target, org opt-in, and explicit profile flags — enforced at policy preflight and re-checked inside every worker."
            />
            <Feature
              tone="emerald"
              title="Scope enforced in-worker"
              body="A shared HTTP wrapper checks every outbound URL against the compiled scope. Buggy adapters cannot escape the allowlist. Metadata + RFC1918 hosts are hard-blocked regardless of user rules."
            />
            <Feature
              tone="violet"
              title="One finding model"
              body="ZAP, Nuclei, TLS scanners, and internal analyzers all normalize to a canonical Finding with a stable fingerprint. Duplicates merge across runs and lifecycle is tracked automatically."
            />
          </div>

          <SectionCard
            eyebrow="What's actually running"
            title="This is not a mockup — the code is the blueprint"
          >
            <div className="grid md:grid-cols-2 gap-8 text-sm text-slate-300 leading-relaxed">
              <div>
                <p className="mb-3">
                  This app boots against a live Neon-shaped Postgres. It seeds a demo
                  organization (<code>Acme Security</code>), a verified target
                  (<code>shop.acme-security.example</code>), two completed scan
                  runs, and a realistic OWASP WSTG-aligned finding set.
                </p>
                <p className="mb-3">
                  The pages under <Link href="/dashboard" className="text-sky-300 hover:underline">/dashboard</Link>,{" "}
                  <Link href="/targets" className="text-sky-300 hover:underline">/targets</Link>,{" "}
                  <Link href="/scans" className="text-sky-300 hover:underline">/scans</Link>,{" "}
                  <Link href="/findings" className="text-sky-300 hover:underline">/findings</Link>{" "}
                  and <Link href="/audit" className="text-sky-300 hover:underline">/audit</Link>{" "}
                  read live rows from that schema. The scope engine, policy
                  engine, and fingerprint/dedup logic are real modules under{" "}
                  <code>src/domain/</code> that a worker fleet would import as-is.
                </p>
              </div>
              <div>
                <p className="mb-3">
                  The <Link href="/spec" className="text-sky-300 hover:underline">/spec</Link>{" "}
                  section is the 20-part implementation-grade blueprint: threat
                  model, schema, RBAC, queue architecture, pipeline stages,
                  authenticated-scan credential handling, evidence redaction,
                  UX information architecture, testing strategy, phased roadmap,
                  and the closing checklists (the &ldquo;top 15 mistakes&rdquo;,
                  the 14-day starter list, MVP + scaling architectures).
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <Pill tone="sky">Next.js App Router</Pill>
                  <Pill tone="sky">Neon Postgres</Pill>
                  <Pill tone="emerald">Drizzle ORM</Pill>
                  <Pill tone="violet">OWASP WSTG</Pill>
                  <Pill tone="amber">Vercel + workers</Pill>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Non-negotiable safety posture"
            title="What this platform will never do"
          >
            <ul className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm text-slate-300">
              <li>• Scan an unverified target</li>
              <li>• Run active tests without explicit org + target + profile opt-in</li>
              <li>• Ship post-exploitation, persistence, or lateral-movement modules</li>
              <li>• Touch RFC1918, loopback, or cloud metadata endpoints</li>
              <li>• Store auth secrets in Postgres in cleartext</li>
              <li>• Let one tenant read another tenant&apos;s rows (app-layer + RLS)</li>
              <li>• Persist evidence without a redaction pass</li>
              <li>• Log request/response bodies containing credentials</li>
            </ul>
          </SectionCard>
        </div>
      </div>
    </Shell>
  );
}

function Feature({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "sky" | "emerald" | "violet";
}) {
  const border =
    tone === "sky"
      ? "border-sky-500/30"
      : tone === "emerald"
        ? "border-emerald-500/30"
        : "border-violet-500/30";
  const dot =
    tone === "sky"
      ? "bg-sky-400"
      : tone === "emerald"
        ? "bg-emerald-400"
        : "bg-violet-400";
  return (
    <div
      className={`rounded-xl border ${border} bg-[#0a0f1c]/60 p-5 backdrop-blur`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        <h3 className="font-semibold text-slate-100">{title}</h3>
      </div>
      <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
    </div>
  );
}
