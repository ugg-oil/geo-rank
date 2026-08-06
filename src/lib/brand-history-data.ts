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

type WeekBoardRow = {
  brandSlug: string;
  rank: number;
  score: number;
};

/**
 * Build per-category rank/score series from published overall boards.
 * Skips weeks where the brand is absent. Does not invent points.
 */
export function buildBrandCategoryHistories(
  slug: string,
  weeksChronological: string[],
  boardsByWeek: Record<string, Record<string, WeekBoardRow[] | undefined>>
): BrandCategoryHistory[] {
  const categorySlugs = new Set<string>();
  for (const week of weeksChronological) {
    for (const categorySlug of Object.keys(boardsByWeek[week] ?? {})) {
      categorySlugs.add(categorySlug);
    }
  }

  const histories: BrandCategoryHistory[] = [];
  for (const categorySlug of [...categorySlugs].sort()) {
    const points: BrandHistoryPoint[] = [];
    for (const week of weeksChronological) {
      const row = boardsByWeek[week]?.[categorySlug]?.find((entry) => entry.brandSlug === slug);
      if (!row) continue;
      points.push({
        week,
        weekDate: week.replace("Week of ", ""),
        rank: row.rank,
        score: row.score,
      });
    }
    if (points.length > 0) {
      histories.push({ categorySlug, points });
    }
  }
  return histories;
}
