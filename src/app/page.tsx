"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldHalf,
  Lock,
  Power,
  Gauge,
  Database,
  Ban,
  ScrollText,
  Crosshair,
  KeyRound,
  Users,
  Network,
  FileWarning,
  Bug,
  ArrowRight,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Layers,
  Boxes,
  GitBranch,
  Cpu,
  HardDrive,
  Server,
  Cloud,
  Workflow,
  Terminal,
  AlertTriangle,
  CircleDot,
  ChevronDown,
} from "lucide-react";
import {
  ZONES,
  STAGES,
  SAFETY_RULES,
  SCHEMA_TABLES,
  API_ROUTES,
  ABUSE_CASES,
  PHASES,
  STACK,
  TOP_MISTAKES,
  NAV_SECTIONS,
  type Zone,
  type Stage,
  type AbuseCase,
  type Phase,
} from "@/components/aegis/blueprint-data";
import Shell, { PageHeader } from "@/components/Shell";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ShieldCheck,
  ShieldHalf,
  Lock,
  Power,
  Gauge,
  Database,
  Ban,
  ScrollText,
  Crosshair,
  KeyRound,
  Users,
  Network,
  FileWarning,
  Bug,
};

const zoneAccent: Record<Zone["color"], { ring: string; text: string; bg: string; dot: string; border: string }> = {
  emerald: { ring: "ring-emerald-500/30", text: "text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-400", border: "border-emerald-500/30" },
  amber: { ring: "ring-amber-500/30", text: "text-amber-400", bg: "bg-amber-500/10", dot: "bg-amber-400", border: "border-amber-500/30" },
  red: { ring: "ring-red-500/30", text: "text-red-400", bg: "bg-red-500/10", dot: "bg-red-400", border: "border-red-500/30" },
  zinc: { ring: "ring-zinc-500/30", text: "text-zinc-300", bg: "bg-zinc-500/10", dot: "bg-zinc-400", border: "border-zinc-500/30" },
};

const methodColor: Record<string, string> = {
  GET: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  POST: "text-amber-400 border-amber-500/40 bg-amber-500/10",
  PATCH: "text-teal-400 border-teal-500/40 bg-teal-500/10",
  PUT: "text-orange-400 border-orange-500/40 bg-orange-500/10",
  DELETE: "text-rose-400 border-rose-500/40 bg-rose-500/10",
};

export default function AegisPortal() {
  const [active, setActive] = useState("overview");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    NAV_SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Shell activePath="/">
      <div className="bg-grid">
        <PageHeader
          eyebrow="Interactive Specification"
          title="Aegis Interactive Showcase"
          description="Visual design specification, pipeline flow visualizer, database schema inspector, and implementation architecture for the Aegis core platform."
          actions={
            <div className="flex gap-2">
              <Link
                href="/dashboard"
                className="rounded-md bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-3.5 py-2 text-sm glow"
              >
                Open live dashboard →
              </Link>
              <Link
                href="/spec"
                className="rounded-md border border-zinc-700 hover:border-zinc-500 text-zinc-200 px-3.5 py-2 text-sm"
              >
                Table of contents
              </Link>
            </div>
          }
        />

        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-6">
          {/* Scroll Navigation */}
          <div className="sticky top-0 z-10 -mx-6 lg:-mx-10 px-6 lg:px-10 py-3 bg-zinc-950/85 backdrop-blur border-b border-zinc-800/80 flex items-center gap-1 overflow-x-auto scrollbar-none">
            {NAV_SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                  active === s.id
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="space-y-16 py-10">
            {/* HERO / OVERVIEW */}
            <section id="overview" className="scroll-mt-24 space-y-6">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  Zinc/Emerald Dark Theme Theme-Matched
                </div>
                <h2 className="text-2xl font-bold text-zinc-50 tracking-tight sm:text-3xl">
                  Authorized, Auditable Web Security Assessments
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-zinc-400">
                  Aegis implements a complete enterprise-grade SaaS architecture for legal, scope-controlled
                  testing of web applications and API surfaces. Passive assessment runs by default, while active probing
                  is restricted by mandatory ownership verification, signed job claims, and a per-request scope gate.
                </p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { k: "16", v: "scan pipeline stages", icon: Workflow },
                  { k: "5", v: "trust zones", icon: Layers },
                  { k: "3", v: "tenancy isolation layers", icon: Boxes },
                  { k: "0", v: "offensive capabilities", icon: Ban },
                ].map((s) => (
                  <div key={s.v} className="rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur p-4">
                    <s.icon className="mb-2 h-4 w-4 text-emerald-400" />
                    <div className="text-2xl font-bold text-zinc-50 tabular-nums">{s.k}</div>
                    <div className="text-xs text-zinc-500 font-medium">{s.v}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* ARCHITECTURE */}
            <section id="architecture" className="scroll-mt-24 space-y-6">
              <div className="border-l-2 border-emerald-500 pl-4">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">System Architecture</div>
                <h2 className="text-xl font-bold text-zinc-50 tracking-tight sm:text-2xl">Five Trust Zones, One Source of Truth</h2>
              </div>
              <p className="max-w-3xl text-xs leading-relaxed text-zinc-400">
                The control-plane dashboard is thin and enqueues jobs to Postgres. Network-egressing crawler and scanner
                workers reside in isolated container runtimes on Fly.io. Credentials are never written in cleartext,
                using enveloped KMS encryption.
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {ZONES.map((zone) => {
                  const a = zoneAccent[zone.color];
                  return (
                    <div key={zone.id} className={`rounded-xl border ${a.border} bg-zinc-900/40 p-4 space-y-3`}>
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-2 text-sm font-bold ${a.text}`}>
                          <span className={`h-2 w-2 rounded-full ${a.dot}`} />
                          {zone.name}
                        </div>
                        <span className={`rounded-md border ${a.border} bg-zinc-950 px-2 py-0.5 text-[9px] uppercase tracking-wider font-semibold ${a.text}`}>
                          {zone.trust}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-zinc-500 leading-snug">{zone.host}</div>
                      <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
                        <span className="text-zinc-600 font-semibold">in</span>
                        <span className="text-zinc-300">{zone.ingress}</span>
                        <span className="text-zinc-600 font-semibold">out</span>
                        <span className="text-zinc-300">{zone.egress}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase tracking-wide text-zinc-600 font-bold">Hardening</div>
                        <div className="flex flex-wrap gap-1">
                          {zone.hardening.map((h) => (
                            <span key={h} className={`rounded border ${a.border} ${a.bg} px-1.5 py-0.5 text-[9px] ${a.text}`}>
                              {h}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase tracking-wide text-zinc-600 font-bold">Runs here</div>
                        <ul className="space-y-0.5 text-xs">
                          {zone.runs.map((r) => (
                            <li key={r} className="flex items-start gap-1.5 text-zinc-400">
                              <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-zinc-600" />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-zinc-400">
                  <GitBranch className="h-3.5 w-3.5" /> Data Flow Pipeline
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                  {["Browser", "Vercel edge", "Control-plane API", "Neon + pgboss", "Workers (Fly)", "Authorized targets", "Evidence → S3"].map((node, i, arr) => (
                    <span key={node} className="flex items-center gap-2">
                      <span className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[11px] text-zinc-300">{node}</span>
                      {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-zinc-600" />}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {/* SAFETY SPINE */}
            <section id="safety" className="scroll-mt-24 space-y-6">
              <div className="border-l-2 border-emerald-500 pl-4">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Non-Negotiable Safety</div>
                <h2 className="text-xl font-bold text-zinc-50 tracking-tight sm:text-2xl">The Safety Spine — Enforced in Code, Policy, & Database</h2>
              </div>
              <p className="max-w-3xl text-xs leading-relaxed text-zinc-400">
                These rules are hard-coded in policy modules and database constraints to make bypass impossible.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {SAFETY_RULES.map((rule) => {
                  const Icon = ICONS[rule.icon] ?? ShieldCheck;
                  return (
                    <div key={rule.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2 hover:border-zinc-700 transition">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 ring-1 ring-emerald-500/30">
                          <Icon className="h-4 w-4 text-emerald-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-zinc-100">{rule.title}</h3>
                      </div>
                      <p className="text-xs text-zinc-300">{rule.rule}</p>
                      <div className="flex items-start gap-1.5 rounded-md bg-zinc-950/60 p-2 font-mono text-[10px] text-emerald-400">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        <span>{rule.enforced}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* SCAN PIPELINE */}
            <section id="pipeline" className="scroll-mt-24 space-y-6">
              <div className="border-l-2 border-emerald-500 pl-4">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Scan Engine</div>
                <h2 className="text-xl font-bold text-zinc-50 tracking-tight sm:text-2xl">A 16-Stage State Machine</h2>
              </div>
              <p className="max-w-3xl text-xs leading-relaxed text-zinc-400">
                Each stage is a discrete, resumable pgboss job. Active stages regularly check cancellation signals.
              </p>

              {/* Horizontal visual map */}
              <div className="overflow-x-auto pb-4 -mx-6 px-6 scrollbar-none">
                <div className="flex min-w-[900px] justify-between gap-2 border border-zinc-800 bg-zinc-900/10 rounded-xl p-4">
                  {STAGES.map((stage) => (
                    <div key={stage.id} className="flex flex-col items-center">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full border text-[11px] font-bold tabular-nums ${
                        stage.skippable ? "border-zinc-700 bg-zinc-900 text-zinc-400" : "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                      }`}>
                        {stage.n}
                      </div>
                      <div className="mt-2 w-20 text-center text-[9px] uppercase tracking-wider font-semibold text-zinc-400 line-clamp-1">{stage.name}</div>
                      <div className="mt-0.5 font-mono text-[8px] text-zinc-600">{stage.queue}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage Table with Custom Tab Filter */}
              <StagesFilter />
            </section>

            {/* SECURITY MODEL */}
            <section id="security" className="scroll-mt-24 space-y-6">
              <div className="border-l-2 border-emerald-500 pl-4">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Platform Security</div>
                <h2 className="text-xl font-bold text-zinc-50 tracking-tight sm:text-2xl">Threat Model with Abuse Case Mitigations</h2>
              </div>
              <p className="max-w-3xl text-xs leading-relaxed text-zinc-400">
                DAST platforms have high-privilege credentials and targets. Mitigate core risk vectors through strict isolation and envelope encryption.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {ABUSE_CASES.map((ac) => {
                  const Icon = ICONS[ac.icon] ?? AlertTriangle;
                  return (
                    <div key={ac.risk} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-500/10 ring-1 ring-red-500/30">
                          <Icon className="h-4 w-4 text-red-400" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold leading-snug text-zinc-100">{ac.risk}</h4>
                          <p className="mt-0.5 font-mono text-[9px] text-zinc-500">context: {ac.where}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-1.5 text-xs pt-1">
                        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        <p className="text-zinc-300">{ac.mitigation}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-zinc-100">Anti-SSRF Stack</h4>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-zinc-400">
                    {["Forbidden IP ranges (RFC1918/metadata)", "DNS pinning defeats rebinding", "Per-request scope gate", "Redirect re-check per hop", "Scheme allowlist (http/https)"].map((i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500/70" />
                        <span>{i}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-zinc-100">Secrets Handling</h4>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-zinc-400">
                    {["Per-org DEK (KMS-wrapped)", "AES-256-GCM + AAD binding", "Secrets-broker on mTLS", "Decrypted in-memory only", "redact() on all logs + reports"].map((i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500/70" />
                        <span>{i}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-emerald-400" />
                    <h4 className="text-xs font-bold text-zinc-100">Tenant Isolation</h4>
                  </div>
                  <ul className="space-y-1.5 text-[11px] text-zinc-400">
                    {["App-layer org filter (primary)", "RLS on every tenant table", "Composite FKs (cross-ref impossible)", "Per-org DEK limits blast radius", "Tenancy isolation test suite"].map((i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500/70" />
                        <span>{i}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* DATABASE SCHEMA */}
            <section id="schema" className="scroll-mt-24 space-y-6">
              <div className="border-l-2 border-emerald-500 pl-4">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Neon Postgres Schema</div>
                <h2 className="text-xl font-bold text-zinc-50 tracking-tight sm:text-2xl">Composite FKs enforce Tenancy</h2>
              </div>
              <p className="max-w-3xl text-xs leading-relaxed text-zinc-400">
                To guarantee isolation, tables use composite foreign keys on <code className="text-emerald-400 font-mono font-semibold">(organization_id, target_id)</code>. Row Level Security is active on every tenant table.
              </p>
              <div className="mt-4">
                <SchemaAccordion />
              </div>
            </section>

            {/* CONTROL-PLANE API */}
            <section id="api" className="scroll-mt-24 space-y-6">
              <div className="border-l-2 border-emerald-500 pl-4">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Control-Plane API</div>
                <h2 className="text-xl font-bold text-zinc-50 tracking-tight sm:text-2xl">RESTful, Idempotent Route Enpoints</h2>
              </div>
              <p className="max-w-3xl text-xs leading-relaxed text-zinc-400">
                Endpoints are versioned under <code className="text-emerald-400">/api/v1</code>. Actions derive organization context from sessions to prevent IDOR attacks.
              </p>
              <div className="overflow-hidden rounded-lg border border-zinc-800">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-500 border-b border-zinc-800">
                      <tr>
                        <th className="px-3 py-2.5 font-medium">Method</th>
                        <th className="px-3 py-2.5 font-medium">Path</th>
                        <th className="px-3 py-2.5 font-medium">Purpose</th>
                        <th className="px-3 py-2.5 font-medium">Auth Claim</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/80">
                      {API_ROUTES.map((r) => (
                        <tr key={r.path + r.method} className="hover:bg-zinc-900/40">
                          <td className="px-3 py-2">
                            <span className={`inline-block rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold ${methodColor[r.method]}`}>
                              {r.method}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-[10px] text-zinc-300">{r.path}</td>
                          <td className="px-3 py-2 text-zinc-400">{r.purpose}</td>
                          <td className="px-3 py-2">
                            <span className="font-mono text-[9px] text-zinc-500">{r.auth}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* ROADMAP */}
            <section id="roadmap" className="scroll-mt-24 space-y-6">
              <div className="border-l-2 border-emerald-500 pl-4">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Phased Delivery</div>
                <h2 className="text-xl font-bold text-zinc-50 tracking-tight sm:text-2xl">Incremental Releases</h2>
              </div>
              <p className="max-w-3xl text-xs leading-relaxed text-zinc-400">
                A 5-phase delivery starting from passive crawling to full enterprise identity integrations.
              </p>
              <div className="space-y-4">
                {PHASES.map((phase) => (
                  <div key={phase.n} className="relative flex gap-4">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                      {phase.n}
                    </div>
                    <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-sm font-semibold text-zinc-100">{phase.name}</h3>
                        <span className="rounded border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-[9px] text-zinc-400 font-medium">
                          {phase.duration}
                        </span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 text-xs">
                        <div>
                          <div className="mb-1 flex items-center gap-1.5 text-[9px] uppercase tracking-wide text-zinc-500 font-bold">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500/70" /> In Scope
                          </div>
                          <p className="leading-relaxed text-zinc-300">{phase.scope}</p>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center gap-1.5 text-[9px] uppercase tracking-wide text-zinc-500 font-bold">
                            <XCircle className="h-3 w-3 text-zinc-500" /> Deferred
                          </div>
                          <p className="leading-relaxed text-zinc-500">{phase.defers}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* TECH STACK */}
            <section id="stack" className="scroll-mt-24 space-y-6">
              <div className="border-l-2 border-emerald-500 pl-4">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Technology stack</div>
                <h2 className="text-xl font-bold text-zinc-50 tracking-tight sm:text-2xl">Opinionated Architecture Choices</h2>
              </div>
              <div className="overflow-hidden rounded-lg border border-zinc-800">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-500 border-b border-zinc-800">
                      <tr>
                        <th className="px-3 py-2.5 font-medium">Concern</th>
                        <th className="px-3 py-2.5 font-medium">Primary Stack</th>
                        <th className="px-3 py-2.5 font-medium">Backup / Upgrade Path</th>
                        <th className="px-3 py-2.5 font-medium">Why</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/80">
                      {STACK.map((s) => (
                        <tr key={s.concern} className="hover:bg-zinc-900/40">
                          <td className="px-3 py-2.5 font-semibold text-zinc-200">{s.concern}</td>
                          <td className="px-3 py-2.5 text-emerald-400 font-medium">{s.primary}</td>
                          <td className="px-3 py-2.5 text-zinc-400">{s.backup}</td>
                          <td className="px-3 py-2.5 text-zinc-500 leading-snug">{s.why}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <Cloud className="mb-2 h-4 w-4 text-emerald-400" />
                  <div className="text-sm font-semibold text-zinc-200">Vercel</div>
                  <div className="text-[10px] text-zinc-500 font-medium">Dashboard + control API</div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <Server className="mb-2 h-4 w-4 text-emerald-400" />
                  <div className="text-sm font-semibold text-zinc-200">Fly.io Machines</div>
                  <div className="text-[10px] text-zinc-500 font-medium">Workers + adapter containers</div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <Database className="mb-2 h-4 w-4 text-emerald-400" />
                  <div className="text-sm font-semibold text-zinc-200">Neon Postgres</div>
                  <div className="text-[10px] text-zinc-500 font-medium">Pooled serverless database</div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                  <HardDrive className="mb-2 h-4 w-4 text-emerald-400" />
                  <div className="text-sm font-semibold text-zinc-200">S3 / R2 + KMS</div>
                  <div className="text-[10px] text-zinc-500 font-medium">Evidence + Envelope Encryption</div>
                </div>
              </div>
            </section>

            {/* PITFALLS */}
            <section id="pitfalls" className="scroll-mt-24 space-y-6">
              <div className="border-l-2 border-emerald-500 pl-4">
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">Common Pitfalls</div>
                <h2 className="text-xl font-bold text-zinc-50 tracking-tight sm:text-2xl">The 15 mistakes that kill this product</h2>
              </div>
              <p className="max-w-3xl text-xs leading-relaxed text-zinc-400">
                Security SaaS platforms often fail on simple implementation details. Avoid these 15 architecture anti-patterns.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {TOP_MISTAKES.map((m, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 p-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-rose-500/10 text-[10px] font-bold text-rose-400">
                      {i + 1}
                    </div>
                    <p className="text-xs leading-relaxed text-zinc-300">{m}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                  <Terminal className="h-4 w-4" /> Minimum Viable Production
                </div>
                <p className="text-xs leading-relaxed text-zinc-300">
                  Vercel (Dashboard/API) · Neon (RLS + pgboss) · Isolated worker services on Fly.io · S3/R2 evidence storage with KMS enveloped keys. That is the minimum architecture that remains securely production-grade.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* Custom Interactive Sub-components */

function StagesFilter() {
  const [tab, setTab] = useState("all");

  const filtered = STAGES.filter((s) => {
    if (tab === "all") return true;
    if (tab === "control") return s.queue === "q.control";
    if (tab === "crawl") return s.queue === "q.crawl";
    if (tab === "passive") return s.queue === "q.passive";
    if (tab === "active") return s.queue === "q.active";
    if (tab === "normalize") return s.queue === "q.normalize";
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Custom Tabs List */}
      <div className="flex flex-wrap gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg max-w-lg">
        {["all", "control", "crawl", "passive", "active", "normalize"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 min-w-[60px] text-center rounded px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition ${
              tab === t ? "bg-zinc-800 text-emerald-400 font-bold" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Custom Tabs Content Grid */}
      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((s) => (
          <div key={s.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold ${
                  s.skippable ? "bg-zinc-800 text-zinc-400" : "bg-emerald-500/15 text-emerald-400"
                }`}>
                  {s.n}
                </span>
                <span className="text-xs font-bold text-zinc-100">{s.name}</span>
              </div>
              {s.skippable && (
                <span className="rounded border border-zinc-800 bg-zinc-900/30 px-1.5 py-0.5 text-[8px] uppercase tracking-wider font-bold text-zinc-500">
                  skippable
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">{s.purpose}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] text-zinc-500">
              <span><span className="text-zinc-600 font-bold">queue</span> {s.queue}</span>
              <span><span className="text-zinc-600 font-bold">worker</span> {s.worker}</span>
              <span><span className="text-zinc-600 font-bold">weight</span> {s.weight}%</span>
            </div>
            <div className="rounded bg-zinc-950/60 p-2 font-mono text-[9px] text-emerald-400">
              → {s.output}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-md border border-zinc-800 bg-zinc-900/30 p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Gauge className="h-3.5 w-3.5 text-emerald-400" />
          <span>Progress Calculation (weighted sum of completed stages)</span>
        </div>
        {/* Custom Progress Bar */}
        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: "62%" }} />
        </div>
        <div className="flex justify-between font-mono text-[9px] text-zinc-600">
          <span>crawl 30%</span>
          <span>passive 20%</span>
          <span>active 30%</span>
          <span>normalize 15%</span>
          <span>report 5%</span>
        </div>
      </div>
    </div>
  );
}

function SchemaAccordion() {
  const [openTable, setOpenTable] = useState<string | null>("targets");

  const toggle = (name: string) => {
    setOpenTable(openTable === name ? null : name);
  };

  return (
    <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl divide-y divide-zinc-800">
      {SCHEMA_TABLES.map((t) => {
        const isOpen = openTable === t.name;
        return (
          <div key={t.name} className="overflow-hidden">
            <button
              onClick={() => toggle(t.name)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-900/20 transition"
            >
              <div className="flex items-center gap-3">
                <Database className="h-4 w-4 text-emerald-400" />
                <span className="font-mono text-xs font-semibold text-zinc-100">{t.name}</span>
                <span className="rounded-md border border-zinc-800 bg-zinc-900/50 px-1.5 py-0.5 text-[8px] uppercase tracking-wider font-bold text-zinc-500">
                  {t.group}
                </span>
              </div>
              <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-1 space-y-3">
                <p className="text-xs text-zinc-400">{t.purpose}</p>
                <div className="overflow-hidden rounded-md border border-zinc-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-900/60 text-[9px] uppercase tracking-wide text-zinc-500 border-b border-zinc-800">
                        <tr>
                          <th className="px-3 py-2 font-medium">Column</th>
                          <th className="px-3 py-2 font-medium">Type</th>
                          <th className="px-3 py-2 font-medium">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/80">
                        {t.columns.map((c) => (
                          <tr key={c.name} className="hover:bg-zinc-900/20">
                            <td className="px-3 py-1.5 font-mono text-emerald-400 font-medium">{c.name}</td>
                            <td className="px-3 py-1.5 font-mono text-zinc-400">{c.type}</td>
                            <td className="px-3 py-1.5 text-zinc-500">{c.note ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
                    <div className="mb-1 text-[9px] uppercase tracking-wide text-zinc-500 font-bold">Indexes</div>
                    <ul className="space-y-0.5">
                      {t.indexes.map((ix) => (
                        <li key={ix} className="font-mono text-[10px] text-zinc-300">{ix}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
                    <div className="mb-1 text-[9px] uppercase tracking-wide text-zinc-500 font-bold">Retention</div>
                    <p className="text-[10px] text-zinc-400 leading-snug">{t.retention}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
