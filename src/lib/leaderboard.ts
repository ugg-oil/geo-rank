import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { COLLECTION_ENGINES, SCORING_VERSION } from "@/lib/constants";
import { coverageExpansionEngines } from "@/lib/engine-scoring";
import {
  type CategoryBoardsData,
  type LeaderboardRow,
  type LeaderboardView,
} from "@/lib/leaderboard-data";
import { getCurrentWeek } from "@/lib/week";
import { getCompanyColumnName, getProductDisplayName } from "@/lib/parent-company";
import { toBrandSlug } from "@/lib/brand-slug";
import { findPreviousPublishedPeriod } from "@/lib/period-sequence";
import { buildAlsoMentioned } from "@/lib/also-mentioned";
import { selectPeriodHighlight } from "@/lib/period-highlight";

export type { CategoryBoardsData, LeaderboardRow, LeaderboardView } from "@/lib/leaderboard-data";
export { inferCollectedEngines, inferScoringEngines } from "@/lib/leaderboard-data";

const REVALIDATE_SECONDS = 300;

/**
 * Build category boards from snapshots (SoT). Shared by FE read path and publish mirror.
 * Returns null when the category has no rows for `week`.
 */
export async function buildCategoryBoardsFromDb(
  category: string,
  week: string
): Promise<CategoryBoardsData | null> {
  const prevWeek = (await findPreviousPublishedPeriod(category, week)) ?? "__none__";
  const [current, previous] = await Promise.all([
    prisma.snapshot.findMany({
      where: { week, category },
      orderBy: { rank: "asc" },
      include: {
        brand: {
          select: {
            canonicalName: true,
            parentBrand: { select: { canonicalName: true } },
          },
        },
      },
    }),
    prevWeek === "__none__"
      ? Promise.resolve([])
      : prisma.snapshot.findMany({
          where: { week: prevWeek, category },
          select: { engine: true, brandId: true, rank: true },
        }),
  ]);

  if (current.length === 0) return null;

  const boards: Record<string, LeaderboardView> = {};
  for (const key of ["overall", ...COLLECTION_ENGINES]) {
    const engine = key === "overall" ? null : key;
    const rows = current.filter((row) => row.engine === engine);
    const previousRows = previous.filter((row) => row.engine === engine);
    const snapshots: LeaderboardRow[] = rows.map((row) => {
      const brandName = getProductDisplayName(row.brand.canonicalName);
      return {
        id: row.id,
        rank: row.rank,
        brandId: row.brandId,
        brandName,
        brandSlug: toBrandSlug(brandName),
        parentCompanyName: getCompanyColumnName(
          row.brand.canonicalName,
          row.brand.parentBrand?.canonicalName
        ),
        score: row.score,
        appearanceRate: row.appearanceRate,
        avgRank: row.avgRank,
        modelCoverage: row.modelCoverage,
      };
    });
    boards[key] = {
      snapshots,
      prevRanks: Object.fromEntries(previousRows.map((row) => [row.brandId, row.rank])),
      hasPrevWeekData: previous.some((row) => row.engine === engine),
    };
  }

  const scoringEngines = COLLECTION_ENGINES.filter(
    (engine) => (boards[engine]?.snapshots.length ?? 0) > 0
  );
  const previousScoringEngines = [
    ...new Set(
      previous.map((row) => row.engine).filter((engine): engine is string => Boolean(engine))
    ),
  ];

  const top20BrandIds = new Set(
    (boards.overall?.snapshots ?? []).map((row) => row.brandId)
  );
  const alsoMentioned = await buildAlsoMentioned(category, week, top20BrandIds);
  const periodHighlight = boards.overall
    ? selectPeriodHighlight({
        overall: boards.overall,
        hasBrandPageIds: top20BrandIds,
      })
    : null;

  return {
    week,
    scoringVersion: SCORING_VERSION,
    collectedEngines: [...COLLECTION_ENGINES],
    scoringEngines,
    coverageExpansion: coverageExpansionEngines(scoringEngines, previousScoringEngines),
    boards,
    ...(alsoMentioned.length > 0 ? { alsoMentioned } : {}),
    ...(periodHighlight ? { periodHighlight } : {}),
  };
}

async function fetchLeaderboard(
  week: string,
  prevWeek: string,
  category: string,
  engine: string | null
) {
  const hasPrev = prevWeek !== "__none__";
  const [snapshots, prevSnapshots, anyPrevData] = await Promise.all([
    prisma.snapshot.findMany({
      where: { week, category, engine },
      orderBy: { rank: "asc" },
      include: { brand: { include: { parentBrand: { select: { canonicalName: true } } } } },
    }),
    hasPrev
      ? prisma.snapshot.findMany({
          where: { week: prevWeek, category, engine },
          include: { brand: true },
        })
      : Promise.resolve([]),
    hasPrev
      ? prisma.snapshot.findFirst({
          where: { week: prevWeek, category },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  return {
    week,
    prevWeek,
    snapshots,
    prevSnapshots,
    hasPrevWeekData: anyPrevData !== null,
  };
}

export async function getCategoryLeaderboard(
  category: string,
  engine: string | null,
  week: string = getCurrentWeek()
) {
  const prevWeek = (await findPreviousPublishedPeriod(category, week)) ?? "__none__";
  const engineKey = engine ?? "overall";

  if (!process.env.NEXT_RUNTIME) {
    return fetchLeaderboard(week, prevWeek, category, engine);
  }

  return unstable_cache(
    () => fetchLeaderboard(week, prevWeek, category, engine),
    ["category-leaderboard", week, prevWeek, category, engineKey],
    { revalidate: REVALIDATE_SECONDS, tags: [`leaderboard-${week}`] }
  )();
}

/** Fetch Overall + all engine boards for an arbitrary published week (DB SoT). */
export async function getAllCategoryLeaderboards(
  category: string,
  week: string = getCurrentWeek()
): Promise<CategoryBoardsData | null> {
  // Scripts / tsx have no Next incremental cache; skip unstable_cache there.
  if (!process.env.NEXT_RUNTIME) {
    return buildCategoryBoardsFromDb(category, week);
  }

  const prevWeek = (await findPreviousPublishedPeriod(category, week)) ?? "__none__";

  return unstable_cache(
    () => buildCategoryBoardsFromDb(category, week),
    ["category-all-boards", week, prevWeek, category],
    { revalidate: REVALIDATE_SECONDS, tags: [`leaderboard-${week}`] }
  )();
}
