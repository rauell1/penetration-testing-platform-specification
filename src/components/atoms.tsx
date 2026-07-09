import { ReactNode } from "react";
import type { Severity, FindingState, ScanRunStatus } from "@/domain/types";

const SEV_STYLES: Record<Severity, string> = {
  info: "bg-slate-700/40 text-slate-300 border-slate-600/40",
  low: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  medium: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  high: "bg-orange-500/10 text-orange-300 border-orange-500/30",
  critical: "bg-rose-500/15 text-rose-300 border-rose-500/40",
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
  new: "bg-sky-500/10 text-sky-300 border-sky-500/30",
  triaged: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
  confirmed: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/30",
  in_remediation: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  resolved: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  wont_fix: "bg-slate-500/10 text-slate-300 border-slate-500/30",
  false_positive: "bg-slate-500/10 text-slate-300 border-slate-500/30",
  accepted_risk: "bg-yellow-500/10 text-yellow-300 border-yellow-500/30",
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
  completed: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  failed: "bg-rose-500/10 text-rose-300 border-rose-500/30",
  cancelled: "bg-slate-500/10 text-slate-300 border-slate-500/30",
  killed: "bg-rose-500/10 text-rose-300 border-rose-500/30",
};

export function RunStatusBadge({ status }: { status: ScanRunStatus }) {
  const cls =
    RUN_STYLES[status] ?? "bg-sky-500/10 text-sky-300 border-sky-500/30";
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
      ? "text-rose-300"
      : tone === "warn"
        ? "text-amber-300"
        : tone === "good"
          ? "text-emerald-300"
          : "text-slate-100";
  return (
    <div className="rounded-lg border border-slate-800 bg-[#0b1220]/80 p-4">
      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
        {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</div>
      {hint && (
        <div className="text-xs text-slate-500 mt-1 leading-snug">{hint}</div>
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
    slate: "bg-slate-700/40 text-slate-300 border-slate-600/40",
    sky: "bg-sky-500/10 text-sky-300 border-sky-500/30",
    emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    amber: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    rose: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    violet: "bg-violet-500/10 text-violet-300 border-violet-500/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${map[tone]}`}
    >
      {children}
    </span>
  );
}
