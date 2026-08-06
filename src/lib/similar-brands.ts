export type SimilarBrandCandidate = {
  slug: string;
  name: string;
  rank: number;
  score: number;
  sharedEngines: number;
  rankDelta: number;
};

type EngineBoard = {
  snapshots: { brandSlug: string; brandName: string; rank: number; score: number }[];
};

/**
 * P1-3 Similar Brands — pure rule, no LLM.
 * Same category, both in latest overall Top 20, |Δrank|≤5, ≥1 shared scoring engine board.
 */
export function selectSimilarBrands(
  slug: string,
  overall: EngineBoard,
  engineBoards: Record<string, EngineBoard>,
  options: { max?: number } = {}
): SimilarBrandCandidate[] {
  const max = options.max ?? 4;
  const self = overall.snapshots.find((row) => row.brandSlug === slug);
  if (!self) return [];

  const selfEngines = new Set<string>();
  for (const [engine, board] of Object.entries(engineBoards)) {
    if (board.snapshots.some((row) => row.brandSlug === slug)) selfEngines.add(engine);
  }

  const candidates: SimilarBrandCandidate[] = [];
  for (const row of overall.snapshots) {
    if (row.brandSlug === slug) continue;
    const rankDelta = Math.abs(row.rank - self.rank);
    if (rankDelta > 5) continue;

    let sharedEngines = 0;
    for (const engine of selfEngines) {
      if (engineBoards[engine]?.snapshots.some((entry) => entry.brandSlug === row.brandSlug)) {
        sharedEngines += 1;
      }
    }
    if (sharedEngines < 1) continue;

    candidates.push({
      slug: row.brandSlug,
      name: row.brandName,
      rank: row.rank,
      score: row.score,
      sharedEngines,
      rankDelta,
    });
  }

  candidates.sort((a, b) => {
    if (a.rankDelta !== b.rankDelta) return a.rankDelta - b.rankDelta;
    if (b.sharedEngines !== a.sharedEngines) return b.sharedEngines - a.sharedEngines;
    return a.slug.localeCompare(b.slug);
  });

  return candidates.slice(0, max);
}
