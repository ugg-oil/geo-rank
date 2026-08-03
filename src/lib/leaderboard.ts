import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { ENGINES } from "@/lib/constants";
import { getCurrentWeek, getPreviousWeek } from "@/lib/week";

const REVALIDATE_SECONDS = 300;

export type LeaderboardRow = {
  id: string;
  rank: number;
  brandId: string;
  brandName: string;
  /** Confirmed parent company at the time this leaderboard was published. */
  parentCompanyName?: string | null;
  score: number;
  appearanceRate: number;
  avgRank: number;
  modelCoverage: number | null;
};

export type LeaderboardView = {
  snapshots: LeaderboardRow[];
  prevRanks: Record<string, number>;
  hasPrevWeekData: boolean;
};

export type CategoryBoardsData = {
  week: string;
  boards: Record<string, LeaderboardView>;
};

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
      brandName: s.brand.canonicalName,
      parentCompanyName: s.brand.parentBrand?.canonicalName ?? null,
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
      const keys = ["overall", ...ENGINES] as const;
      const engineValues: (string | null)[] = [null, ...ENGINES];

      const results = await Promise.all(
        engineValues.map((engine) =>
          fetchLeaderboard(week, prevWeek, category, engine)
        )
      );

      const boards: Record<string, LeaderboardView> = {};
      keys.forEach((key, i) => {
        boards[key] = toLeaderboardView(results[i]);
      });

      return { week, boards };
    },
    ["category-all-boards", week, category],
    { revalidate: REVALIDATE_SECONDS, tags: [`leaderboard-${week}`] }
  )();
}
