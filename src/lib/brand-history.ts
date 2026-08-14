import { cache } from "react";
import { CATEGORY_TO_SLUG } from "@/lib/categories";
import { prisma } from "@/lib/db";
import { resolveBrandIdBySlug } from "@/lib/brand-resolve";
import {
  buildBrandCategoryHistories,
  type BrandCategoryHistory,
  type BrandHistoryPoint,
} from "@/lib/brand-history-data";
import { getPublishedLeaderboardWeeks } from "@/lib/published-leaderboard";
import { ttlCache } from "@/lib/ttl-cache";

export type { BrandCategoryHistory, BrandHistoryPoint };

/**
 * Rank/score history for a brand across published overall boards.
 * One snapshot query for this brandId — do not scan every category board.
 */
export const getBrandCategoryHistories = cache(
  async (slug: string): Promise<BrandCategoryHistory[]> => {
    return ttlCache(`brand-history:${slug}`, 60_000, () => loadBrandCategoryHistories(slug));
  }
);

async function loadBrandCategoryHistories(slug: string): Promise<BrandCategoryHistory[]> {
  const [weeks, brandId] = await Promise.all([
    getPublishedLeaderboardWeeks(),
    resolveBrandIdBySlug(slug),
  ]);
  if (weeks.length === 0 || !brandId) return [];
  const chronological = [...weeks].reverse();

  const snaps = await prisma.snapshot.findMany({
    where: { engine: null, week: { in: weeks }, brandId },
    select: {
      week: true,
      category: true,
      rank: true,
      score: true,
    },
  });

  const boardsByWeek: Record<
    string,
    Record<string, { brandSlug: string; rank: number; score: number }[]>
  > = {};
  for (const s of snaps) {
    const categorySlug = CATEGORY_TO_SLUG[s.category];
    if (!categorySlug) continue;
    boardsByWeek[s.week] ??= {};
    boardsByWeek[s.week][categorySlug] ??= [];
    boardsByWeek[s.week][categorySlug].push({
      brandSlug: slug,
      rank: s.rank,
      score: s.score,
    });
  }

  return buildBrandCategoryHistories(slug, chronological, boardsByWeek);
}
