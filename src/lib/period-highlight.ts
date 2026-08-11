import type { LeaderboardRow, LeaderboardView } from "@/lib/leaderboard-data";
import { getRankDelta } from "@/lib/rank-change";

export type PeriodHighlightKind = "took_first" | "largest_climb" | "debut";

export type PeriodHighlight = {
  kind: PeriodHighlightKind;
  brandId: string;
  brandName: string;
  brandSlug: string;
  hasBrandPage: boolean;
  /** largest_climb / debut */
  rank?: number;
  /** largest_climb only */
  spots?: number;
};

const MIN_CLIMB_SPOTS = 2;

function brandFields(
  row: LeaderboardRow,
  hasBrandPageIds?: Set<string>
): Pick<PeriodHighlight, "brandId" | "brandName" | "brandSlug" | "hasBrandPage"> {
  return {
    brandId: row.brandId,
    brandName: row.brandName,
    brandSlug: row.brandSlug,
    hasBrandPage: hasBrandPageIds ? hasBrandPageIds.has(row.brandId) : true,
  };
}

/**
 * Pick one period highlight from Overall vs previous published period.
 * Priority: #1 change → largest climb (spots ≥ 2) → highest NEW debut.
 */
export function selectPeriodHighlight(args: {
  overall: LeaderboardView;
  /** When omitted, hasBrandPage defaults to true for selected brands. */
  hasBrandPageIds?: Set<string>;
}): PeriodHighlight | null {
  const { overall, hasBrandPageIds } = args;
  if (!overall.hasPrevWeekData) return null;

  const currentFirst =
    overall.snapshots.find((row) => row.rank === 1) ?? overall.snapshots[0];
  const prevFirstId = Object.entries(overall.prevRanks).find(([, rank]) => rank === 1)?.[0];
  if (currentFirst && prevFirstId && currentFirst.brandId !== prevFirstId) {
    return { kind: "took_first", ...brandFields(currentFirst, hasBrandPageIds) };
  }

  let bestClimb: { row: LeaderboardRow; spots: number } | null = null;
  for (const row of overall.snapshots) {
    const delta = getRankDelta(row.rank, overall.prevRanks, row.brandId, true);
    if (delta.kind !== "up" || delta.spots < MIN_CLIMB_SPOTS) continue;
    if (
      !bestClimb ||
      delta.spots > bestClimb.spots ||
      (delta.spots === bestClimb.spots && row.rank < bestClimb.row.rank) ||
      (delta.spots === bestClimb.spots &&
        row.rank === bestClimb.row.rank &&
        row.brandSlug.localeCompare(bestClimb.row.brandSlug) < 0)
    ) {
      bestClimb = { row, spots: delta.spots };
    }
  }
  if (bestClimb) {
    return {
      kind: "largest_climb",
      ...brandFields(bestClimb.row, hasBrandPageIds),
      spots: bestClimb.spots,
      rank: bestClimb.row.rank,
    };
  }

  let bestDebut: LeaderboardRow | null = null;
  for (const row of overall.snapshots) {
    const delta = getRankDelta(row.rank, overall.prevRanks, row.brandId, true);
    if (delta.kind !== "new") continue;
    if (
      !bestDebut ||
      row.rank < bestDebut.rank ||
      (row.rank === bestDebut.rank && row.brandSlug.localeCompare(bestDebut.brandSlug) < 0)
    ) {
      bestDebut = row;
    }
  }
  if (bestDebut) {
    return {
      kind: "debut",
      ...brandFields(bestDebut, hasBrandPageIds),
      rank: bestDebut.rank,
    };
  }

  return null;
}
