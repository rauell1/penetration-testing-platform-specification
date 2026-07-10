"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { RunStatusBadge } from "@/components/atoms";
import { TableFilter, applyFilter } from "@/components/ui/TableFilter";
import type { ScanRunStatus } from "@/domain/types";

export interface ScanRow {
  id: string;
  targetLabel: string | null;
  status: string;
  pages: number | null;
  requests: number | null;
  findings: number | null;
  finishedAt: Date | null;
}

const STATUSES: { value: ScanRunStatus; label: string }[] = [
  { value: "queued", label: "Queued" },
  { value: "crawling", label: "Crawling" },
  { value: "passive", label: "Passive" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "killed", label: "Killed" },
];

export function ScansTable({ rows }: { rows: ScanRow[] }) {
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      applyFilter(
        rows as unknown as Record<string, unknown>[],
        query,
        chip
      ) as unknown as ScanRow[],
    [rows, query, chip]
  );

  return (
    <div className="space-y-4">
      <TableFilter
        placeholder="Search id, target, status…"
        chips={STATUSES}
        query={query}
        chip={chip}
        total={rows.length}
        visible={filtered.length}
        onQueryChange={setQuery}
        onChipChange={setChip}
      />
      <div className="overflow-x-auto -mx-5">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-widest text-zinc-500">
            <tr>
              <th className="text-left px-5 py-2">Run</th>
              <th className="text-left px-5 py-2">Target</th>
              <th className="text-left px-5 py-2">Status</th>
              <th className="text-right px-5 py-2">Pages</th>
              <th className="text-right px-5 py-2">Requests</th>
              <th className="text-right px-5 py-2">Findings</th>
              <th className="text-left px-5 py-2">Finished</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="border-t border-zinc-800/60 hover:bg-zinc-800/20"
              >
                <td className="px-5 py-2">
                  <Link
                    href={`/scans/${r.id}`}
                    className="text-emerald-400 hover:underline font-mono text-xs"
                  >
                    {r.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-5 py-2 text-zinc-300">{r.targetLabel ?? "—"}</td>
                <td className="px-5 py-2">
                  <RunStatusBadge status={r.status as ScanRunStatus} />
                </td>
                <td className="px-5 py-2 text-right tabular-nums text-zinc-300">
                  {r.pages ?? "—"}
                </td>
                <td className="px-5 py-2 text-right tabular-nums text-zinc-300">
                  {r.requests ?? "—"}
                </td>
                <td className="px-5 py-2 text-right tabular-nums text-zinc-100 font-semibold">
                  {r.findings ?? "—"}
                </td>
                <td className="px-5 py-2 text-zinc-500 text-xs">
                  {r.finishedAt ? new Date(r.finishedAt).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-zinc-500">
                  No scans match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
