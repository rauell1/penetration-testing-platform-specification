"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { SeverityChip, StateBadge } from "@/components/atoms";
import { TableFilter, applyFilter } from "@/components/ui/TableFilter";
import type { FindingState, Severity } from "@/domain/types";

export interface FindingRow {
  id: string;
  title: string;
  category: string;
  severity: string;
  state: string;
  wstgId?: string | null;
  lastSeenAt: Date;
}

const SEVERITIES: { value: Severity; label: string }[] = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "info", label: "Info" },
];

export function FindingsTable({ rows }: { rows: FindingRow[] }) {
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      applyFilter(
        rows as unknown as Record<string, unknown>[],
        query,
        chip
      ) as unknown as FindingRow[],
    [rows, query, chip]
  );

  return (
    <div className="space-y-4">
      <TableFilter
        placeholder="Search title, category, WSTG…"
        chips={SEVERITIES}
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
              <th className="text-left px-5 py-2">Sev</th>
              <th className="text-left px-5 py-2">Title</th>
              <th className="text-left px-5 py-2">Category</th>
              <th className="text-left px-5 py-2">WSTG</th>
              <th className="text-left px-5 py-2">State</th>
              <th className="text-left px-5 py-2">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => (
              <tr
                key={f.id}
                className="border-t border-zinc-800/60 hover:bg-zinc-800/20"
              >
                <td className="px-5 py-2">
                  <SeverityChip severity={f.severity as Severity} />
                </td>
                <td className="px-5 py-2">
                  <Link
                    href={`/findings/${f.id}`}
                    className="text-zinc-100 hover:text-emerald-400"
                  >
                    {f.title}
                  </Link>
                </td>
                <td className="px-5 py-2 text-zinc-400 capitalize">{f.category}</td>
                <td className="px-5 py-2 text-zinc-400 font-mono text-xs">
                  {f.wstgId ?? "—"}
                </td>
                <td className="px-5 py-2">
                  <StateBadge state={f.state as FindingState} />
                </td>
                <td className="px-5 py-2 text-zinc-500 text-xs">
                  {new Date(f.lastSeenAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-zinc-500">
                  No findings match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
