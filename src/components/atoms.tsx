import { ReactNode } from "react";
import type { Severity, FindingState, ScanRunStatus } from "@/domain/types";

const SEV_STYLES: Record<Severity, string> = {
  info: "bg-zinc-800/40 text-zinc-300 border-zinc-700/40",
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  critical: "bg-rose-500/15 text-rose-400 border-rose-500/40",
};

export function SeverityChip({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${SEV_STYLES[severity]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {severity}
    </span>
  );
}

const STATE_STYLES: Record<FindingState, string> = {
  new: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  triaged: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  confirmed: "bg-rose-500/15 text-rose-400 border-rose-500/40",
  in_remediation: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  resolved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  wont_fix: "bg-zinc-800/10 text-zinc-400 border-zinc-700/30",
  false_positive: "bg-zinc-800/10 text-zinc-400 border-zinc-700/30",
  accepted_risk: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
};

export function StateBadge({ state }: { state: FindingState }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${STATE_STYLES[state]}`}
    >
      {state.replace(/_/g, " ")}
    </span>
  );
}

const RUN_STYLES: Partial<Record<ScanRunStatus, string>> = {
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  failed: "bg-rose-500/10 text-rose-400 border-rose-500/30",
  cancelled: "bg-zinc-800/10 text-zinc-400 border-zinc-700/30",
  killed: "bg-rose-500/10 text-rose-400 border-rose-500/30",
};

export function RunStatusBadge({ status }: { status: ScanRunStatus }) {
  const cls =
    RUN_STYLES[status] ?? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${cls}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "danger" | "warn" | "good";
}) {
  const toneClass =
    tone === "danger"
      ? "text-rose-400"
      : tone === "warn"
        ? "text-amber-400"
        : tone === "good"
          ? "text-emerald-400"
          : "text-zinc-100";
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
        {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</div>
      {hint && (
        <div className="text-xs text-zinc-500 mt-1 leading-snug">{hint}</div>
      )}
    </div>
  );
}

export function Pill({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "sky" | "emerald" | "amber" | "rose" | "violet";
}) {
  const map: Record<string, string> = {
    slate: "bg-zinc-800/40 text-zinc-300 border-zinc-700/40",
    sky: "bg-teal-500/10 text-teal-400 border-teal-500/30",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    violet: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${map[tone]}`}
    >
      {children}
    </span>
  );
}
