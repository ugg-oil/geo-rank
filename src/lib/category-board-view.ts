/**
 * P2 category board view logic: Top 20 table sorting (P2-1) and the
 * 2–3 product compare selection (P2-2). Kept out of the component so the
 * rules are verifiable without a DOM.
 */

import type { LeaderboardRow } from "@/lib/leaderboard-data";

export type SortKey = "score" | "appearanceRate" | "avgRank" | "modelCoverage";

export const DEFAULT_SORT_KEY: SortKey = "score";

/** avgRank is the only metric where a smaller number is better. */
export const ASCENDING_SORT_KEYS = new Set<SortKey>(["avgRank"]);

/** P2-2: compare needs at least 2 products and allows at most 3. */
export const COMPARE_MAX = 3;
export const COMPARE_MIN = 2;

/** Coverage only exists on Overall — engine tabs fall back to the default. */
export function resolveSortKey(sortKey: SortKey, isOverall: boolean): SortKey {
  if (sortKey === "modelCoverage" && !isOverall) return DEFAULT_SORT_KEY;
  return sortKey;
}

/** Natural direction unless the user flipped this column. */
export function isAscendingSort(key: SortKey, flipped: ReadonlySet<SortKey>): boolean {
  const natural = ASCENDING_SORT_KEYS.has(key);
  return flipped.has(key) ? !natural : natural;
}

/** Toggle the flip flag for `key`, resetting flips when the column changes. */
export function nextSortState(
  current: { sortKey: SortKey; flipped: ReadonlySet<SortKey> },
  clicked: SortKey
): { sortKey: SortKey; flipped: Set<SortKey> } {
  if (clicked !== current.sortKey) {
    return { sortKey: clicked, flipped: new Set() };
  }
  const flipped = new Set(current.flipped);
  if (flipped.has(clicked)) flipped.delete(clicked);
  else flipped.add(clicked);
  return { sortKey: clicked, flipped };
}

/**
 * Sort a copy of the board. Rows missing the metric (coverage can be null)
 * sink to the bottom; ties fall back to the published rank.
 */
export function sortLeaderboardRows<T extends LeaderboardRow>(
  rows: readonly T[],
  key: SortKey,
  ascending: boolean
): T[] {
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av === null && bv === null) return a.rank - b.rank;
    if (av === null) return 1;
    if (bv === null) return -1;
    if (av === bv) return a.rank - b.rank;
    return ascending ? av - bv : bv - av;
  });
}

/** Add / remove a brand, refusing additions past COMPARE_MAX. */
export function toggleCompareSelection(
  selected: readonly string[],
  brandId: string,
  max = COMPARE_MAX
): string[] {
  if (selected.includes(brandId)) return selected.filter((id) => id !== brandId);
  if (selected.length >= max) return [...selected];
  return [...selected, brandId];
}

export function canCompare(count: number, min = COMPARE_MIN): boolean {
  return count >= min;
}

/** Metrics shown in the compare dialog; coverage is Overall-only. */
export function compareMetricKeys(showCoverage: boolean): SortKey[] {
  const keys: SortKey[] = ["score", "appearanceRate", "avgRank"];
  if (showCoverage) keys.push("modelCoverage");
  return keys;
}

/** Best value among compared rows, or null when no row has the metric. */
export function compareBestValue(
  key: SortKey,
  rows: readonly LeaderboardRow[]
): number | null {
  const values = rows
    .map((row) => row[key])
    .filter((value): value is number => value !== null);
  if (values.length === 0) return null;
  return ASCENDING_SORT_KEYS.has(key) ? Math.min(...values) : Math.max(...values);
}
