import { getPublishedBrandPage } from "@/lib/brand-page";
import { getPublishedLeaderboardWeeks } from "@/lib/published-leaderboard";

export type BrandHistoryPoint = {
  week: string;
  weekDate: string;
  rank: number;
  score: number;
};

export type BrandCategoryHistory = {
  categorySlug: string;
  points: BrandHistoryPoint[];
};

/**
 * Read rank/score history for a brand across published weekly snapshots.
 * Data is read-only from Blob; scores are not recomputed.
 */
export async function getBrandCategoryHistories(
  slug: string
): Promise<BrandCategoryHistory[]> {
  const weeks = await getPublishedLeaderboardWeeks();
  if (weeks.length < 2) return [];

  const chronological = [...weeks].reverse();
  const snapshots = await Promise.all(
    chronological.map((week) => getPublishedBrandPage(slug, week))
  );

  const categorySlugs = new Set<string>();
  for (const snapshot of snapshots) {
    for (const category of snapshot?.categories ?? []) {
      categorySlugs.add(category.slug);
    }
  }

  const histories: BrandCategoryHistory[] = [];
  for (const categorySlug of categorySlugs) {
    const points: BrandHistoryPoint[] = [];
    for (let i = 0; i < chronological.length; i++) {
      const week = chronological[i];
      const category = snapshots[i]?.categories.find((entry) => entry.slug === categorySlug);
      if (!category) continue;
      points.push({
        week,
        weekDate: week.replace("Week of ", ""),
        rank: category.rank,
        score: category.score,
      });
    }
    if (points.length >= 2) {
      histories.push({ categorySlug, points });
    }
  }

  return histories;
}
