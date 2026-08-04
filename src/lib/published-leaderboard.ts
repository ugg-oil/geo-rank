import type { CategoryBoardsData, LeaderboardRow } from "@/lib/leaderboard";
import { getCurrentWeek } from "@/lib/week";
import { getCompanyColumnName, getProductDisplayName } from "@/lib/parent-company";
import { toBrandSlug } from "@/lib/brand-slug";

export type PublishedLeaderboardManifest = {
  version?: number;
  week?: string;
  publishedAt?: string;
  boards?: Record<string, string>;
};
export type PublishedLeaderboardIndex = { version?: number; weeks?: string[] };

const PUBLISHED_REVALIDATE_SECONDS = process.env.NODE_ENV === "development" ? 0 : 300;

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

function getIndexUrl(manifestUrl: string) {
  const url = new URL(manifestUrl);
  url.pathname = url.pathname.replace(/\/leaderboards\/latest\/manifest\.json$/, "/leaderboards/index.json");
  return url.toString();
}

export async function getPublishedLeaderboardWeeks(): Promise<string[]> {
  const manifestUrl = process.env.LEADERBOARD_MANIFEST_URL;
  if (!manifestUrl) return [];
  try {
    const response = await fetch(getIndexUrl(manifestUrl), { next: { revalidate: PUBLISHED_REVALIDATE_SECONDS } });
    if (!response.ok) return [];
    const index = (await response.json()) as PublishedLeaderboardIndex;
    return (index.weeks ?? []).filter((week) => /^Week of \d{4}-\d{2}-\d{2}$/.test(week)).slice(0, 12);
  } catch { return []; }
}

export async function getPublishedLeaderboardManifest(week = getCurrentWeek()): Promise<PublishedLeaderboardManifest | null> {
  const manifestUrl = process.env.LEADERBOARD_MANIFEST_URL;
  if (!manifestUrl) return null;
  const weekManifestUrl = getWeekManifestUrl(manifestUrl, week);

  try {
    const response = await fetch(weekManifestUrl, { next: { revalidate: PUBLISHED_REVALIDATE_SECONDS } });
    if (!response.ok) return null;
    return (await response.json()) as PublishedLeaderboardManifest;
  } catch {
    return null;
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

export async function getPublishedCategoryLeaderboards(
  slug: string,
  week = getCurrentWeek()
): Promise<CategoryBoardsData | null> {
  const manifestUrl = process.env.LEADERBOARD_MANIFEST_URL;
  const debug = process.env.LOG_PUBLISHED_LEADERBOARD === "1";
  const logPrefix = "[PublishedLeaderboard]";

  if (!manifestUrl) {
    if (debug) console.debug(`${logPrefix} LEADERBOARD_MANIFEST_URL not set; using fallback.`);
    return null;
  }
  const weekManifestUrl = getWeekManifestUrl(manifestUrl, week);

  try {
    const manifestResponse = await fetch(weekManifestUrl, { next: { revalidate: PUBLISHED_REVALIDATE_SECONDS } });
    if (!manifestResponse.ok) {
      if (debug) console.debug(`${logPrefix} manifest fetch not ok: ${manifestResponse.status}`);
      return null;
    }
    const manifest = (await manifestResponse.json()) as PublishedLeaderboardManifest;

    // 防止 latest 指错周导致页面展示错误数据：如果 manifest 带 week 字段且与当前周不一致则回退。
    if (manifest.week && manifest.week !== week) {
      if (debug) console.debug(`${logPrefix} manifest week mismatch: ${manifest.week} != ${week}`);
      return null;
    }

    const boardUrl = manifest.boards?.[slug];
    if (!boardUrl) {
      if (debug) console.debug(`${logPrefix} board url missing for slug=${slug}`);
      return null;
    }

    const response = await fetch(boardUrl, { next: { revalidate: PUBLISHED_REVALIDATE_SECONDS } });
    if (!response.ok) {
      if (debug) console.debug(`${logPrefix} board fetch not ok: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as CategoryBoardsData;
    for (const board of Object.values(data.boards)) {
      board.snapshots = board.snapshots.map(normalizeRow);
    }
    if (debug) console.debug(`${logPrefix} using published data for slug=${slug}`);
    return data;
  } catch (error) {
    if (debug) console.warn(`${logPrefix} failed; using fallback.`, error);
    return null;
  }
}
