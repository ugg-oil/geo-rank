import { CATEGORY_CARDS } from "@/lib/category-cards";
import {
  buildBrandCategoryHistories,
  type BrandCategoryHistory,
  type BrandHistoryPoint,
} from "@/lib/brand-history-data";
import { getPublishedCategoryLeaderboards, getPublishedLeaderboardWeeks } from "@/lib/published-leaderboard";

export type { BrandCategoryHistory, BrandHistoryPoint };

/**
 * Rank/score history for a brand across published weekly overall boards.
 * Uses DB published weeks + DB boards (same SoT as B1).
 */
export async function getBrandCategoryHistories(
  slug: string
): Promise<BrandCategoryHistory[]> {
  const weeks = await getPublishedLeaderboardWeeks();
  if (weeks.length === 0) return [];

  const chronological = [...weeks].reverse();
  const categorySlugs = CATEGORY_CARDS.map((category) => category.slug);

  const boardsByWeek: Record<string, Record<string, { brandSlug: string; rank: number; score: number }[]>> =
    {};

  await Promise.all(
    chronological.map(async (week) => {
      const categoryBoards = await Promise.all(
        categorySlugs.map(async (categorySlug) => {
          const board = await getPublishedCategoryLeaderboards(categorySlug, week);
          return {
            categorySlug,
            rows:
              board?.boards.overall.snapshots.map((row) => ({
                brandSlug: row.brandSlug,
                rank: row.rank,
                score: row.score,
              })) ?? [],
          };
        })
      );
      boardsByWeek[week] = Object.fromEntries(
        categoryBoards.map((entry) => [entry.categorySlug, entry.rows])
      );
    })
  );

  return buildBrandCategoryHistories(slug, chronological, boardsByWeek);
}
