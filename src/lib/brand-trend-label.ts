import type { BrandHistoryPoint } from "@/lib/brand-history-data";

export type TrendLabel = "Rising" | "Stable" | "Declining";

/**
 * P1-2 trend label from the most recent up-to-4 published weeks with a rank.
 * Needs ≥3 valid points. Δ = new − old (rank smaller is better).
 */
export function computeTrendLabel(points: BrandHistoryPoint[]): TrendLabel | null {
  const window = points.slice(-4);
  if (window.length < 3) return null;

  let older: number;
  let newer: number;
  if (window.length >= 4) {
    older = (window[0]!.rank + window[1]!.rank) / 2;
    newer = (window[2]!.rank + window[3]!.rank) / 2;
  } else {
    older = window[0]!.rank;
    newer = window[window.length - 1]!.rank;
  }

  const delta = newer - older;
  if (delta <= -2) return "Rising";
  if (delta >= 2) return "Declining";
  return "Stable";
}
