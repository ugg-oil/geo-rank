/** Shared week-over-week rank change helpers (PRD P1). */

export type RankDelta =
  | { kind: "up"; spots: number }
  | { kind: "down"; spots: number }
  | { kind: "same" }
  | { kind: "new" }
  | { kind: "none" };

export type MoverDirection = "up" | "down" | "new" | "out";

export type RankMover = {
  brandId: string;
  brandName: string;
  brandSlug: string;
  parentCompanyName?: string | null;
  categorySlug: string;
  categoryName: string;
  direction: MoverDirection;
  /** Positive spots gained (up) or lost (down/out). NEW uses prev-as-unranked. */
  spots: number;
  rank: number | null;
  previousRank: number | null;
};

export function getRankDelta(
  currentRank: number,
  prevRanks: Record<string, number>,
  brandId: string,
  hasPrevWeekData: boolean
): RankDelta {
  if (!hasPrevWeekData) return { kind: "none" };
  const prevRank = prevRanks[brandId];
  if (prevRank === undefined) return { kind: "new" };
  const delta = prevRank - currentRank;
  if (delta > 0) return { kind: "up", spots: delta };
  if (delta < 0) return { kind: "down", spots: Math.abs(delta) };
  return { kind: "same" };
}

/** Brands on the previous board that are missing from the current Top N. */
export function getDroppedBrands(
  currentBrandIds: Set<string>,
  prevRanks: Record<string, number>,
  hasPrevWeekData: boolean
): { brandId: string; previousRank: number }[] {
  if (!hasPrevWeekData) return [];
  return Object.entries(prevRanks)
    .filter(([brandId]) => !currentBrandIds.has(brandId))
    .map(([brandId, previousRank]) => ({ brandId, previousRank }))
    .sort((a, b) => a.previousRank - b.previousRank);
}

type BoardRow = {
  brandId: string;
  brandName: string;
  brandSlug: string;
  parentCompanyName?: string | null;
  rank: number;
};

type BoardLike = {
  snapshots: BoardRow[];
  prevRanks: Record<string, number>;
  hasPrevWeekData: boolean;
};

type PrevNamesMap = Record<string, { brandName: string; brandSlug: string; parentCompanyName?: string | null }>;

/**
 * Build movers for one category overall board.
 * Ranking gain = previousRank - currentRank (higher = bigger climb).
 */
export function collectCategoryMovers(
  board: BoardLike,
  categorySlug: string,
  categoryName: string,
  prevNames?: PrevNamesMap
): RankMover[] {
  if (!board.hasPrevWeekData) return [];

  const movers: RankMover[] = [];
  const currentIds = new Set(board.snapshots.map((row) => row.brandId));

  for (const row of board.snapshots) {
    const delta = getRankDelta(row.rank, board.prevRanks, row.brandId, true);
    if (delta.kind === "up") {
      movers.push({
        brandId: row.brandId,
        brandName: row.brandName,
        brandSlug: row.brandSlug,
        parentCompanyName: row.parentCompanyName,
        categorySlug,
        categoryName,
        direction: "up",
        spots: delta.spots,
        rank: row.rank,
        previousRank: board.prevRanks[row.brandId],
      });
    } else if (delta.kind === "down") {
      movers.push({
        brandId: row.brandId,
        brandName: row.brandName,
        brandSlug: row.brandSlug,
        parentCompanyName: row.parentCompanyName,
        categorySlug,
        categoryName,
        direction: "down",
        spots: delta.spots,
        rank: row.rank,
        previousRank: board.prevRanks[row.brandId],
      });
    } else if (delta.kind === "new") {
      movers.push({
        brandId: row.brandId,
        brandName: row.brandName,
        brandSlug: row.brandSlug,
        parentCompanyName: row.parentCompanyName,
        categorySlug,
        categoryName,
        direction: "new",
        spots: 0,
        rank: row.rank,
        previousRank: null,
      });
    }
  }

  for (const dropped of getDroppedBrands(currentIds, board.prevRanks, true)) {
    const meta = prevNames?.[dropped.brandId];
    movers.push({
      brandId: dropped.brandId,
      brandName: meta?.brandName ?? "Unknown",
      brandSlug: meta?.brandSlug ?? "",
      parentCompanyName: meta?.parentCompanyName,
      categorySlug,
      categoryName,
      direction: "out",
      spots: dropped.previousRank,
      rank: null,
      previousRank: dropped.previousRank,
    });
  }

  return movers;
}

export function pickBiggestMovers(
  movers: RankMover[],
  limit = 5
): { risers: RankMover[]; fallers: RankMover[] } {
  const risers = movers
    .filter((m) => m.direction === "up" || m.direction === "new")
    .sort((a, b) => {
      if (a.direction !== b.direction) return a.direction === "new" ? 1 : -1;
      if (b.spots !== a.spots) return b.spots - a.spots;
      return (a.rank ?? 99) - (b.rank ?? 99);
    })
    .slice(0, limit);

  const fallers = movers
    .filter((m) => m.direction === "down" || m.direction === "out")
    .sort((a, b) => {
      if (a.direction === "out" && b.direction !== "out") return -1;
      if (b.direction === "out" && a.direction !== "out") return 1;
      if (b.spots !== a.spots) return b.spots - a.spots;
      return (b.previousRank ?? 0) - (a.previousRank ?? 0);
    })
    .slice(0, limit);

  return { risers, fallers };
}
