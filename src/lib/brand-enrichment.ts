import { CATEGORY_CARDS } from "@/lib/category-cards";
import { evaluateLayerB } from "@/lib/brand-layer-b";
import { getBrandIndex } from "@/lib/brand-page";
import { inferScoringEngines } from "@/lib/leaderboard-data";
import {
  getPublishedCategoryLeaderboards,
  getPublishedLeaderboardWeeks,
} from "@/lib/published-leaderboard";
import { selectSimilarBrands, type SimilarBrandCandidate } from "@/lib/similar-brands";

async function loadOverallRowsByWeek(weeks: string[]) {
  const categorySlugs = CATEGORY_CARDS.map((category) => category.slug);
  const boardsByWeek: Record<string, Record<string, { brandSlug: string }[]>> = {};

  await Promise.all(
    weeks.map(async (week) => {
      const categoryBoards = await Promise.all(
        categorySlugs.map(async (categorySlug) => {
          const board = await getPublishedCategoryLeaderboards(categorySlug, week);
          return {
            categorySlug,
            rows:
              board?.boards.overall.snapshots.map((row) => ({
                brandSlug: row.brandSlug,
              })) ?? [],
          };
        })
      );
      boardsByWeek[week] = Object.fromEntries(
        categoryBoards.map((entry) => [entry.categorySlug, entry.rows])
      );
    })
  );

  return boardsByWeek;
}

export async function getBrandLayerBStatus(slug: string) {
  const weeks = await getPublishedLeaderboardWeeks();
  if (weeks.length === 0) {
    return { layerB: false as const, consecutiveLayerA: 0, windowWeeks: [] as string[] };
  }
  const boardsByWeek = await loadOverallRowsByWeek(weeks.slice(0, 4));
  return evaluateLayerB(slug, weeks, boardsByWeek);
}

export async function getLayerBBrandSlugs(): Promise<string[]> {
  const [weeks, index] = await Promise.all([
    getPublishedLeaderboardWeeks(),
    getBrandIndex(),
  ]);
  if (weeks.length < 4) return [];

  const boardsByWeek = await loadOverallRowsByWeek(weeks.slice(0, 4));
  return Object.keys(index)
    .filter((slug) => evaluateLayerB(slug, weeks, boardsByWeek).layerB)
    .sort();
}

export async function getSimilarBrandsForBrand(
  slug: string,
  categorySlugs: string[]
): Promise<Record<string, SimilarBrandCandidate[]>> {
  const weeks = await getPublishedLeaderboardWeeks();
  const latest = weeks[0];
  if (!latest) return {};

  const result: Record<string, SimilarBrandCandidate[]> = {};
  await Promise.all(
    categorySlugs.map(async (categorySlug) => {
      const board = await getPublishedCategoryLeaderboards(categorySlug, latest);
      if (!board) {
        result[categorySlug] = [];
        return;
      }
      const scoringEngines = inferScoringEngines(board);
      const engineBoards = Object.fromEntries(
        scoringEngines.map((engine) => [
          engine,
          {
            snapshots: (board.boards[engine]?.snapshots ?? []).map((row) => ({
              brandSlug: row.brandSlug,
              brandName: row.brandName,
              rank: row.rank,
              score: row.score,
            })),
          },
        ])
      );
      result[categorySlug] = selectSimilarBrands(
        slug,
        {
          snapshots: board.boards.overall.snapshots.map((row) => ({
            brandSlug: row.brandSlug,
            brandName: row.brandName,
            rank: row.rank,
            score: row.score,
          })),
        },
        engineBoards
      );
    })
  );
  return result;
}
