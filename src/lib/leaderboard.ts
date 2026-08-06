import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { COLLECTION_ENGINES, SCORING_VERSION } from "@/lib/constants";
import { coverageExpansionEngines } from "@/lib/engine-scoring";
import {
  type CategoryBoardsData,
  type LeaderboardView,
} from "@/lib/leaderboard-data";
import { getCurrentWeek, getPreviousWeek } from "@/lib/week";
import { getCompanyColumnName, getProductDisplayName } from "@/lib/parent-company";
import { toBrandSlug } from "@/lib/brand-slug";

export type { CategoryBoardsData, LeaderboardRow, LeaderboardView } from "@/lib/leaderboard-data";
export { inferCollectedEngines, inferScoringEngines } from "@/lib/leaderboard-data";

const REVALIDATE_SECONDS = 300;

async function fetchLeaderboard(
  week: string,
  prevWeek: string,
  category: string,
  engine: string | null
) {
  const [snapshots, prevSnapshots, anyPrevData] = await Promise.all([
    prisma.snapshot.findMany({
      where: { week, category, engine },
      orderBy: { rank: "asc" },
      include: { brand: { include: { parentBrand: { select: { canonicalName: true } } } } },
    }),
    prisma.snapshot.findMany({
      where: { week: prevWeek, category, engine },
      include: { brand: true },
    }),
    prisma.snapshot.findFirst({
      where: { week: prevWeek, category },
      select: { id: true },
    }),
  ]);

  return {
    week,
    prevWeek,
    snapshots,
    prevSnapshots,
    hasPrevWeekData: anyPrevData !== null,
  };
}

function toLeaderboardView(
  data: Awaited<ReturnType<typeof fetchLeaderboard>>
): LeaderboardView {
  return {
    snapshots: data.snapshots.map((s) => ({
      id: s.id,
      rank: s.rank,
      brandId: s.brandId,
      brandName: getProductDisplayName(s.brand.canonicalName),
      brandSlug: toBrandSlug(getProductDisplayName(s.brand.canonicalName)),
      parentCompanyName: getCompanyColumnName(
        s.brand.canonicalName,
        s.brand.parentBrand?.canonicalName
      ),
      score: s.score,
      appearanceRate: s.appearanceRate,
      avgRank: s.avgRank,
      modelCoverage: s.modelCoverage,
    })),
    prevRanks: Object.fromEntries(
      data.prevSnapshots.map((s) => [s.brandId, s.rank])
    ),
    hasPrevWeekData: data.hasPrevWeekData,
  };
}

export async function getCategoryLeaderboard(
  category: string,
  engine: string | null
) {
  const week = getCurrentWeek();
  const prevWeek = getPreviousWeek(week);
  const engineKey = engine ?? "overall";

  return unstable_cache(
    () => fetchLeaderboard(week, prevWeek, category, engine),
    ["category-leaderboard", week, category, engineKey],
    { revalidate: REVALIDATE_SECONDS, tags: [`leaderboard-${week}`] }
  )();
}

/** Fetch Overall + all engine boards in parallel (one server round-trip for tab switching). */
export async function getAllCategoryLeaderboards(
  category: string
): Promise<CategoryBoardsData> {
  const week = getCurrentWeek();
  const prevWeek = getPreviousWeek(week);

  return unstable_cache(
    async () => {
      const keys = ["overall", ...COLLECTION_ENGINES] as const;
      const engineValues: (string | null)[] = [null, ...COLLECTION_ENGINES];

      const results = await Promise.all(
        engineValues.map((engine) =>
          fetchLeaderboard(week, prevWeek, category, engine)
        )
      );

      const boards: Record<string, LeaderboardView> = {};
      keys.forEach((key, i) => {
        boards[key] = toLeaderboardView(results[i]);
      });

      const scoringEngines = COLLECTION_ENGINES.filter(
        (engine) => boards[engine].snapshots.length > 0
      );
      const previousScoringEngines = COLLECTION_ENGINES.filter(
        (_engine, index) => results[index + 1]?.prevSnapshots.length > 0
      );

      return {
        week,
        scoringVersion: SCORING_VERSION,
        collectedEngines: [...COLLECTION_ENGINES],
        scoringEngines,
        coverageExpansion: coverageExpansionEngines(scoringEngines, previousScoringEngines),
        boards,
      };
    },
    ["category-all-boards", week, category],
    { revalidate: REVALIDATE_SECONDS, tags: [`leaderboard-${week}`] }
  )();
}
