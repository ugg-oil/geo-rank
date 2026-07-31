import type { CategoryBoardsData } from "@/lib/leaderboard";
import { getCurrentWeek } from "@/lib/week";

export type PublishedLeaderboardManifest = {
  version?: number;
  week?: string;
  publishedAt?: string;
  boards?: Record<string, string>;
};

export async function getPublishedLeaderboardManifest(): Promise<PublishedLeaderboardManifest | null> {
  const manifestUrl = process.env.LEADERBOARD_MANIFEST_URL;
  if (!manifestUrl) return null;

  try {
    const response = await fetch(manifestUrl, { next: { revalidate: 300 } });
    if (!response.ok) return null;
    return (await response.json()) as PublishedLeaderboardManifest;
  } catch {
    return null;
  }
}

export async function getPublishedCategoryLeaderboards(
  slug: string
): Promise<CategoryBoardsData | null> {
  const manifestUrl = process.env.LEADERBOARD_MANIFEST_URL;
  const debug = process.env.LOG_PUBLISHED_LEADERBOARD === "1";
  const logPrefix = "[PublishedLeaderboard]";
  const currentWeek = getCurrentWeek();

  if (!manifestUrl) {
    if (debug) console.debug(`${logPrefix} LEADERBOARD_MANIFEST_URL not set; using fallback.`);
    return null;
  }

  try {
    const manifestResponse = await fetch(manifestUrl, { next: { revalidate: 300 } });
    if (!manifestResponse.ok) {
      if (debug) console.debug(`${logPrefix} manifest fetch not ok: ${manifestResponse.status}`);
      return null;
    }
    const manifest = (await manifestResponse.json()) as PublishedLeaderboardManifest;

    // 防止 latest 指错周导致页面展示错误数据：如果 manifest 带 week 字段且与当前周不一致则回退。
    if (manifest.week && manifest.week !== currentWeek) {
      if (debug) console.debug(`${logPrefix} manifest week mismatch: ${manifest.week} != ${currentWeek}`);
      return null;
    }

    const boardUrl = manifest.boards?.[slug];
    if (!boardUrl) {
      if (debug) console.debug(`${logPrefix} board url missing for slug=${slug}`);
      return null;
    }

    const response = await fetch(boardUrl, { next: { revalidate: 300 } });
    if (!response.ok) {
      if (debug) console.debug(`${logPrefix} board fetch not ok: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as CategoryBoardsData;
    if (debug) console.debug(`${logPrefix} using published data for slug=${slug}`);
    return data;
  } catch (error) {
    if (debug) console.warn(`${logPrefix} failed; using fallback.`, error);
    return null;
  }
}
