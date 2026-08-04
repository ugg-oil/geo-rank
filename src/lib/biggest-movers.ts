import { CATEGORY_SLUG_MAP } from "@/lib/categories";
import {
  collectCategoryMovers,
  pickBiggestMovers,
  type RankMover,
} from "@/lib/rank-change";
import {
  getPublishedCategoryLeaderboards,
  getPublishedLeaderboardWeeks,
} from "@/lib/published-leaderboard";
import { getPreviousWeek } from "@/lib/week";

export type BiggestMoversResult = {
  week: string;
  previousWeek: string | null;
  risers: RankMover[];
  fallers: RankMover[];
};

/**
 * Biggest Movers from published overall boards: latest week vs previous week.
 * Brand links point to Brand Page v1.
 */
export async function getBiggestMovers(limit = 5): Promise<BiggestMoversResult | null> {
  const weeks = await getPublishedLeaderboardWeeks();
  if (weeks.length === 0) return null;

  const week = weeks[0];
  const calendarPrev = getPreviousWeek(week);
  const previousWeek =
    weeks.find((candidate) => candidate === calendarPrev) ?? weeks[1] ?? null;

  const slugs = Object.keys(CATEGORY_SLUG_MAP);
  const boards = await Promise.all(
    slugs.map((slug) => getPublishedCategoryLeaderboards(slug, week))
  );

  // Optional: previous week names for OUT rows (publish JSON may not keep prev names).
  const prevBoards = previousWeek
    ? await Promise.all(
        slugs.map((slug) => getPublishedCategoryLeaderboards(slug, previousWeek))
      )
    : [];

  const allMovers: RankMover[] = [];
  for (let i = 0; i < slugs.length; i++) {
    const data = boards[i];
    if (!data?.boards.overall) continue;
    const overall = data.boards.overall;
    let board = overall;

    // If publish-time prevRanks are empty but we have a previous published week,
    // rebuild prevRanks from that board so movers still work.
    if (!overall.hasPrevWeekData && prevBoards[i]?.boards.overall) {
      const prevOverall = prevBoards[i]!.boards.overall;
      board = {
        ...overall,
        prevRanks: Object.fromEntries(
          prevOverall.snapshots.map((row) => [row.brandId, row.rank])
        ),
        hasPrevWeekData: prevOverall.snapshots.length > 0,
      };
    }

    const prevNames = Object.fromEntries(
      (prevBoards[i]?.boards.overall.snapshots ?? []).map((row) => [
        row.brandId,
        {
          brandName: row.brandName,
          brandSlug: row.brandSlug,
          parentCompanyName: row.parentCompanyName,
        },
      ])
    );

    allMovers.push(
      ...collectCategoryMovers(
        board,
        slugs[i],
        CATEGORY_SLUG_MAP[slugs[i]],
        prevNames
      )
    );
  }

  if (allMovers.length === 0) {
    return { week, previousWeek, risers: [], fallers: [] };
  }

  const { risers, fallers } = pickBiggestMovers(allMovers, limit);
  return { week, previousWeek, risers, fallers };
}
