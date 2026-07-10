"use client";

import { X } from "lucide-react";

export interface Chip {
  field: string;
  value: string;
  label: string;
}

export function TableFilter({
  placeholder = "Search…",
  chips = [],
  query,
  chip,
  total,
  visible,
  onQueryChange,
  onChipChange,
}: {
  placeholder?: string;
  chips?: Chip[];
  query: string;
  chip: string | null;
  total: number;
  visible: number;
  onQueryChange: (q: string) => void;
  onChipChange: (c: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-[200px] rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60"
        />
        {(query || chip) && (
          <button
            onClick={() => {
              onQueryChange("");
              onChipChange(null);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-100"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
        <span className="text-xs text-zinc-500 tabular-nums">
          {visible} / {total}
        </span>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => onChipChange(null)}
            className={`rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold transition ${
              chip === null
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-zinc-800 text-zinc-400 hover:text-zinc-100"
            }`}
          >
            All
          </button>
          {chips.map((c) => (
            <button
              key={c.value}
              onClick={() => onChipChange(c.value)}
              className={`rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold transition ${
                chip === c.value
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-800 text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function applyFilter<T extends Record<string, unknown>>(
  rows: T[],
  query: string,
  chip: Chip | null
): T[] {
  const q = query.toLowerCase().trim();
  return rows.filter((row) => {
    const matchesQuery = q ? JSON.stringify(row).toLowerCase().includes(q) : true;
    const matchesChip = chip
      ? String(row[chip.field] ?? "").toLowerCase() === chip.value.toLowerCase()
      : true;
    return matchesQuery && matchesChip;
  });
}
