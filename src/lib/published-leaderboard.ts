import type { CategoryBoardsData, LeaderboardRow } from "@/lib/leaderboard-data";
import { CATEGORY_SLUG_MAP } from "@/lib/categories";
import { prisma } from "@/lib/db";
import { getAllCategoryLeaderboards } from "@/lib/leaderboard";
import { getCurrentWeek } from "@/lib/week";
import { toStoragePeriodKey, tryNormalizePeriodDate } from "@/lib/period";
import { getCompanyColumnName, getProductDisplayName } from "@/lib/parent-company";
import { toBrandSlug } from "@/lib/brand-slug";

export type PublishedLeaderboardManifest = {
  version?: number;
  week?: string;
  publishedAt?: string;
  boards?: Record<string, string>;
  scoringVersion?: number;
  collectedEngines?: string[];
  scoringEngineUnion?: string[];
  promptCount?: number;
};
export type PublishedLeaderboardIndex = { version?: number; weeks?: string[] };

const PUBLISHED_REVALIDATE_SECONDS = process.env.NODE_ENV === "development" ? 0 : 300;
/** Match publish index.json: weeks with at least a handful of snapshot rows. */
const MIN_SNAPSHOTS_PER_WEEK = 4;
const MAX_PUBLISHED_WEEKS = 12;

function getWeekManifestUrl(manifestUrl: string, week: string) {
  try {
    const url = new URL(manifestUrl);
    const latestPath = "/leaderboards/latest/manifest.json";
    if (url.pathname.endsWith(latestPath)) {
      url.pathname = url.pathname.slice(0, -latestPath.length) +
        `/leaderboards/${encodeURIComponent(week)}/manifest.json`;
    }
    return url.toString();
  } catch {
    return manifestUrl;
  }
}

function normalizeRow(row: LeaderboardRow): LeaderboardRow {
  const brandName = getProductDisplayName(row.brandName);
  return {
    ...row,
    brandName,
    brandSlug: toBrandSlug(brandName),
    parentCompanyName: getCompanyColumnName(brandName, row.parentCompanyName),
  };
}

/** Week list from snapshots (SoT). Blob index is not consulted. */
export async function getPublishedLeaderboardWeeks(): Promise<string[]> {
  const snapshotCounts = await prisma.snapshot.groupBy({
    by: ["week"],
    _count: { id: true },
  });
  return snapshotCounts
    .filter((row) => row._count.id >= MIN_SNAPSHOTS_PER_WEEK)
    .map((row) => {
      const date = tryNormalizePeriodDate(row.week);
      return date ? toStoragePeriodKey(date) : null;
    })
    .filter((week): week is string => Boolean(week))
    .sort((a, b) => b.localeCompare(a))
    .slice(0, MAX_PUBLISHED_WEEKS);
}

/**
 * Optional Blob manifest metadata (debug / home stats). Not used as SoT for boards or weeks.
 * Fetches only when `LEADERBOARD_MANIFEST_URL` is set (opt-in URL, not default SoT).
 */
export async function getPublishedLeaderboardManifest(
  week = getCurrentWeek()
): Promise<PublishedLeaderboardManifest | null> {
  const manifestUrl = process.env.LEADERBOARD_MANIFEST_URL;
  if (!manifestUrl) return null;
  const weekManifestUrl = getWeekManifestUrl(manifestUrl, week);

  try {
    const response = await fetch(weekManifestUrl, {
      next: { revalidate: PUBLISHED_REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    return (await response.json()) as PublishedLeaderboardManifest;
  } catch {
    return null;
  }
}

/**
 * Category boards for a published week — DB-first (snapshots SoT).
 * Blob is not required; LEADERBOARD_MANIFEST_URL may be unset or broken.
 */
export async function getPublishedCategoryLeaderboards(
  slug: string,
  week = getCurrentWeek()
): Promise<CategoryBoardsData | null> {
  const debug = process.env.LOG_PUBLISHED_LEADERBOARD === "1";
  const logPrefix = "[PublishedLeaderboard]";
  const category = CATEGORY_SLUG_MAP[slug];
  if (!category) {
    if (debug) console.debug(`${logPrefix} unknown slug=${slug}`);
    return null;
  }

  const data = await getAllCategoryLeaderboards(category, week);
  if (!data || (data.boards.overall?.snapshots.length ?? 0) === 0) {
    if (debug) {
      console.debug(`${logPrefix} no DB snapshots for slug=${slug} week=${week}`);
    }
    return null;
  }

  for (const board of Object.values(data.boards)) {
    board.snapshots = board.snapshots.map(normalizeRow);
  }
  if (debug) console.debug(`${logPrefix} using DB boards for slug=${slug} week=${week}`);
  return data;
}
