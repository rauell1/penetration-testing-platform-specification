"use client";

import { useState, useMemo } from "react";
import { Pill } from "@/components/atoms";
import { TableFilter, applyFilter } from "@/components/ui/TableFilter";

export interface AuditRow {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: Date;
}

const ACTIONS = [
  { value: "scan.", label: "Scan" },
  { value: "scan.kill", label: "Kill" },
  { value: "target.verify", label: "Target" },
  { value: "finding.", label: "Finding" },
  { value: "policy.", label: "Policy" },
  { value: "auth.", label: "Auth" },
];

export function AuditTable({ rows }: { rows: AuditRow[] }) {
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return rows.filter((r) => {
      const matchesQuery =
        !q ||
        r.action.toLowerCase().includes(q) ||
        (r.targetType ?? "").toLowerCase().includes(q) ||
        (r.targetId ?? "").toLowerCase().includes(q);
      const matchesChip = chip ? r.action.startsWith(chip) : true;
      return matchesQuery && matchesChip;
    });
  }, [rows, query, chip]);

  return (
    <div className="space-y-4">
      <TableFilter
        placeholder="Search action, target…"
        chips={ACTIONS}
        query={query}
        chip={chip}
        total={rows.length}
        visible={filtered.length}
        onQueryChange={setQuery}
        onChipChange={setChip}
      />
      <ul className="divide-y divide-zinc-800/60">
        {filtered.map((r) => (
          <li key={r.id} className="py-3 flex items-center gap-3 text-sm">
            <Pill tone={toneFor(r.action)}>{r.action}</Pill>
            {r.targetType && (
              <span className="text-zinc-400 text-xs">
                {r.targetType}: <code>{r.targetId?.slice(0, 8) ?? "—"}</code>
              </span>
            )}
            <span className="ml-auto text-[11px] text-zinc-500 tabular-nums">
              {new Date(r.createdAt).toISOString().replace("T", " ").slice(0, 19)}
            </span>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="py-10 text-center text-sm text-zinc-500">
            No audit events match your filters.
          </li>
        )}
      </ul>
    </div>
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
