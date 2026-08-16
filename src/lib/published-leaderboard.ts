import { cache } from "react";
import { ttlCache } from "@/lib/ttl-cache";
import type { CategoryBoardsData, LeaderboardRow } from "@/lib/leaderboard-data";
import { CATEGORY_SLUG_MAP, CATEGORY_TO_SLUG } from "@/lib/categories";
import { prisma } from "@/lib/db";
import { getAllCategoryLeaderboards } from "@/lib/leaderboard";
import { getCurrentWeek } from "@/lib/week";
import { toStoragePeriodKey, tryNormalizePeriodDate } from "@/lib/period";
import { listPublishedOverallWeeks } from "@/lib/period-sequence";
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

async function loadPublishedLeaderboardWeeks(): Promise<string[]> {
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

/** Week list from snapshots (SoT). Request-deduped + 60s process cache. */
export const getPublishedLeaderboardWeeks = cache(() =>
  ttlCache("published-leaderboard-weeks", 60_000, loadPublishedLeaderboardWeeks)
);

/**
 * Published periods that have an Overall board for this category (P0-7).
 * 14-day categories must not list 7-day-only global weeks in the selector.
 */
export async function getPublishedWeeksForCategory(category: string): Promise<string[]> {
  return listPublishedOverallWeeks(category);
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
  const category = CATEGORY_SLUG_MAP[slug];
  if (!category) return null;
  const weekKey = toStoragePeriodKey(week);
  return ttlCache(`published-boards:${slug}:${weekKey}`, 60_000, async () => {
    const debug = process.env.LOG_PUBLISHED_LEADERBOARD === "1";
    const logPrefix = "[PublishedLeaderboard]";
    const data = await getAllCategoryLeaderboards(category, weekKey);
    if (!data || (data.boards.overall?.snapshots.length ?? 0) === 0) {
      if (debug) {
        console.debug(`${logPrefix} no DB snapshots for slug=${slug} week=${weekKey}`);
      }
      return null;
    }
    for (const board of Object.values(data.boards)) {
      board.snapshots = board.snapshots.map(normalizeRow);
    }
    if (debug) console.debug(`${logPrefix} using DB boards for slug=${slug} week=${weekKey}`);
    return data;
  });
}

export type CategoryCardLeader = {
  rank: number;
  brandName: string;
  brandSlug: string;
  score: number;
};

export type CategoryCardLeaders = Record<string, CategoryCardLeader[] | null>;

/**
 * Rankings index cards: overall Top 3 per category from that category's newest overall week.
 * One snapshot query — not 13 full boards.
 */
export const getCategoryCardLeaders = cache(async (): Promise<CategoryCardLeaders> => {
  return ttlCache("category-card-leaders-v2", 60_000, loadCategoryCardLeaders);
});

async function loadCategoryCardLeaders(): Promise<CategoryCardLeaders> {
  const snaps = await prisma.snapshot.findMany({
    where: { engine: null, rank: { in: [1, 2, 3] } },
    select: {
      week: true,
      category: true,
      rank: true,
      score: true,
      brand: { select: { canonicalName: true } },
    },
  });

  const latestWeek = new Map<string, string>();
  for (const snap of snaps) {
    const slug = CATEGORY_TO_SLUG[snap.category];
    if (!slug) continue;
    const date = tryNormalizePeriodDate(snap.week);
    if (!date) continue;
    const week = toStoragePeriodKey(date);
    const prev = latestWeek.get(slug);
    if (!prev || week > prev) latestWeek.set(slug, week);
  }

  const bySlug = new Map<string, Map<number, CategoryCardLeader>>();
  for (const snap of snaps) {
    const slug = CATEGORY_TO_SLUG[snap.category];
    if (!slug) continue;
    const date = tryNormalizePeriodDate(snap.week);
    if (!date) continue;
    const week = toStoragePeriodKey(date);
    if (week !== latestWeek.get(slug)) continue;

    const brandName = getProductDisplayName(snap.brand.canonicalName);
    const ranks = bySlug.get(slug) ?? new Map<number, CategoryCardLeader>();
    ranks.set(snap.rank, {
      rank: snap.rank,
      brandName,
      brandSlug: toBrandSlug(brandName),
      score: snap.score,
    });
    bySlug.set(slug, ranks);
  }

  return Object.fromEntries(
    Object.keys(CATEGORY_SLUG_MAP).map((slug) => {
      const ranks = bySlug.get(slug);
      if (!ranks || ranks.size === 0) return [slug, null];
      return [slug, [...ranks.values()].sort((a, b) => a.rank - b.rank)];
    })
  );
}
