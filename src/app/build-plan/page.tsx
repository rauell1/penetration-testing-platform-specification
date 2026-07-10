import Shell, { PageHeader, SectionCard } from "@/components/Shell";

const PHASES = [
  {
    n: 1,
    name: "Scanning Infrastructure",
    duration: "Weeks 1-4",
    items: [
      "Build pgboss job enqueue endpoint (`POST /api/scans`) with scope preflight",
      "Implement worker bootstrap: mTLS handshake, job claim, dead-letter queue",
      "Dockerize + deploy crawler worker to Fly.io (headless Chrome, JS rendering)",
      "Store raw evidence (screenshots, HAR, DOM snapshots) in S3/R2",
      "Real-time progress: WebSocket or SSE endpoint for scan status",
    ],
  },
  {
    n: 2,
    name: "Passive Engine",
    duration: "Weeks 5-8",
    items: [
      "Build passive analysis worker: DOM parsing, header inspection, cookie audit",
      "Implement WSTG category checks (information gathering, config analysis)",
      "Build evidence normalizer: fingerprint collision + dedup logic per domain",
      "Writing findings back to Postgres with stable canonical fingerprints",
    ],
  },
  {
    n: 3,
    name: "Active Engine (Gated)",
    duration: "Weeks 9-12",
    items: [
      "Implement per-target active opt-in flow (ownership re-verification)",
      "Build active scanner worker (scope-gated, kill-switch-checked)",
      "Implement anti-SSRF guard: DNS pinning, redirect re-check, IP deny list",
      "Build vulnerability detection modules aligned to WSTG active tests",
      "Secrets broker on mTLS: per-org DEK decryption in isolated workers",
    ],
  },
  {
    n: 4,
    name: "Team & Billing",
    duration: "Weeks 13-16",
    items: [
      "Invite flow: email + token, role assignment, org membership",
      "Stripe integration: plan tiers, usage metering, subscription lifecycle",
      "Quota enforcement: monthly scan caps linked to plan limits",
      "Admin panel: org management, plan overrides, manual kill switch",
    ],
  },
  {
    n: 5,
    name: "Operational Readiness",
    duration: "Weeks 17-20",
    items: [
      "CI/CD pipeline: GitHub Actions → Vercel staging → Fly.io canary",
      "Monitoring: Sentry + Datadog dashboards, scan failure alerts",
      "Automated testing: unit, integration (pgTAP), E2E (Playwright)",
      "Security audit: penetration test of the platform itself",
      "Documentation: runbook, incident response, on-call rotation",
    ],
  },
];

const SPIKES = [
  { name: "SSRF prevention", detail: "IP deny lists (metadata, RFC1918, CGNAT), DNS rebinding guard, redirect re-check per hop, scheme allowlist" },
  { name: "Envelope encryption", detail: "Per-org DEK wrapped with KMS master key, AES-256-GCM with AAD binding, decrypted only in isolated workers" },
  { name: "Evidence pipeline", detail: "S3/R2 bucket with bucket policy restricting PUT to worker identities, evidence retention (30d / 90d / 1y), evidence redaction" },
  { name: "Tenant isolation", detail: "RLS on every row, composite FKs, per-org content encryption, tenancy test harness" },
  { name: "Worker lifecycle", detail: "Graceful shutdown on SIGTERM, dead-letter retry with exponential backoff, max runtime cap per job stage" },
];

export default function BuildPlanPage() {
  return (
    <Shell activePath="/build-plan">
      <PageHeader
        eyebrow="Goal B · Production Build-Out"
        title="From blueprint to running SaaS"
        description="This page is the living roadmap for transforming this reference architecture into a real, revenue-generating penetration testing platform. Each phase builds on the last."
      />
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10 space-y-8">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0 mt-0.5">
            A
          </div>
          <div className="text-sm text-zinc-300 leading-relaxed">
            <strong className="text-zinc-100">Goal A (complete):</strong> Reference architecture, auth, live Postgres dashboard, security features, spec docs. Everything below is <strong className="text-emerald-300">Goal B</strong> — the production build-out.
          </div>
        </div>

        {PHASES.map((phase) => (
          <SectionCard key={phase.n}>
            <div className="flex items-start gap-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                {phase.n}
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold text-zinc-100">{phase.name}</h3>
                  <span className="rounded border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-[10px] text-zinc-400 font-medium">
                    {phase.duration}
                  </span>
                </div>
                <ul className="space-y-2">
                  {phase.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-zinc-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </SectionCard>
        ))}

        <SectionCard title="Design Spikes (pre-implementation)">
          <div className="grid gap-4 md:grid-cols-2">
            {SPIKES.map((spike) => (
              <div key={spike.name} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 space-y-1.5">
                <div className="text-sm font-semibold text-zinc-100">{spike.name}</div>
                <p className="text-xs text-zinc-400 leading-relaxed">{spike.detail}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Quick start for Goal B</div>
          <div className="font-mono text-xs text-zinc-400">
            <p className="mb-1"><span className="text-emerald-400">npm run db:push</span>  # schema is already migration-ready</p>
            <p className="mb-1"><span className="text-emerald-400">npm run rls:apply</span> # enable RLS policies</p>
            <p className="mb-1"><span className="text-emerald-400"># then build Phase 1:</span> enqueue + fly deploy</p>
            <p><span className="text-emerald-400">POST /api/scans</span>  {'->'} pgboss {'->'} worker {'->'} S3 evidence</p>
          </div>
        </div>
      </div>
    </Shell>
  );
}
