// ============================================================================
// Finding fingerprint + normalization. The fingerprint is a stable canonical
// key that survives across scan runs so that we can:
//   - dedupe results from multiple adapters (ZAP + Nuclei both flag XSS on
//     the same param -> one Finding, two FindingInstances, two provenances)
//   - track lifecycle (first_seen/last_seen/resolved/regression)
// ============================================================================

import { createHash } from "node:crypto";
import type {
  NormalizedFinding,
  RawScannerFinding,
  Severity,
  Confidence,
} from "./types";

const SEVERITY_RANK: Record<Severity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const CONFIDENCE_RANK: Record<Confidence, number> = {
  tentative: 0,
  firm: 1,
  certain: 2,
};

/**
 * Canonical fingerprint. We deliberately EXCLUDE anything volatile:
 *   - query string values
 *   - session tokens
 *   - scanner-assigned IDs
 *   - timestamps
 * We INCLUDE stable structural identity:
 *   - category
 *   - CWE or WSTG id when known
 *   - host + normalized path + method
 *   - parameter name (not value)
 */
export function fingerprintFinding(f: {
  category: string;
  wstgId?: string;
  cwe?: string;
  host: string;
  method?: string;
  path?: string;
  parameter?: string;
}): string {
  const parts = [
    f.category.toLowerCase(),
    f.wstgId ?? "",
    f.cwe ?? "",
    f.host.toLowerCase(),
    (f.method ?? "").toUpperCase(),
    normalizePath(f.path),
    (f.parameter ?? "").toLowerCase(),
  ];
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}

function normalizePath(path?: string): string {
  if (!path) return "";
  // Replace numeric IDs and UUIDs with placeholders so /users/42 and
  // /users/99 collapse into the same finding fingerprint.
  return path
    .split("?")[0]
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:uuid")
    .replace(/\/\d+(?=\/|$)/g, "/:id");
}

/**
 * Merge raw findings that share the same fingerprint into a single
 * normalized finding, preserving all provenance strings and taking the
 * strongest (severity, confidence) signal available.
 */
export function normalizeGroup(raws: RawScannerFinding[]): NormalizedFinding {
  if (raws.length === 0) throw new Error("normalizeGroup requires at least one finding");
  const first = raws[0];

  let severity: Severity = first.severity;
  let confidence: Confidence = first.confidence;
  const provenance = new Set<string>();
  const references = new Set<string>();

  for (const r of raws) {
    if (SEVERITY_RANK[r.severity] > SEVERITY_RANK[severity]) severity = r.severity;
    if (CONFIDENCE_RANK[r.confidence] > CONFIDENCE_RANK[confidence])
      confidence = r.confidence;
    provenance.add(r.scannerProvenance);
    if (r.raw && typeof r.raw === "object") {
      const refs = (r.raw as { references?: unknown }).references;
      if (Array.isArray(refs)) {
        for (const ref of refs) {
          if (typeof ref === "string") references.add(ref);
        }
      }
    }
  }

  return {
    fingerprint: fingerprintFinding(first),
    title: first.title,
    summary: first.summary,
    category: first.category,
    wstgId: first.wstgId,
    cwe: first.cwe,
    severity,
    confidence,
    host: first.host,
    method: first.method,
    path: first.path,
    parameter: first.parameter,
    scannerProvenance: Array.from(provenance).sort(),
    references: Array.from(references).sort(),
  };
}

/** Group raw findings by fingerprint. */
export function groupByFingerprint(
  raws: RawScannerFinding[],
): Map<string, RawScannerFinding[]> {
  const groups = new Map<string, RawScannerFinding[]>();
  for (const r of raws) {
    const fp = fingerprintFinding(r);
    const g = groups.get(fp);
    if (g) g.push(r);
    else groups.set(fp, [r]);
  }
  return groups;
}
