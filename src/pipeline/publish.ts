import { put } from "@vercel/blob";
import { canPublishToBlob, blobPutOptions } from "@/lib/blob-publish";
import { prisma } from "@/lib/db";
import { CATEGORY_TO_SLUG } from "@/lib/categories";
import { ENGINES } from "@/lib/constants";
import { getPreviousWeek } from "@/lib/week";
import type { CategoryBoardsData, LeaderboardRow, LeaderboardView } from "@/lib/leaderboard";
import { assessPublishedManifest, type PublicationResult } from "@/lib/pipeline-health";
import { errorContext, logPipelineEvent } from "@/lib/pipeline-observability";

async function buildCategory(category: string, week: string): Promise<CategoryBoardsData> {
  const prevWeek = getPreviousWeek(week);
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
    prisma.snapshot.findMany({
      where: { week: prevWeek, category },
      select: { engine: true, brandId: true, rank: true },
    }),
  ]);

  const boards: Record<string, LeaderboardView> = {};
  for (const key of ["overall", ...ENGINES]) {
    const engine = key === "overall" ? null : key;
    const rows = current.filter((row) => row.engine === engine);
    const previousRows = previous.filter((row) => row.engine === engine);
    const snapshots: LeaderboardRow[] = rows.map((row) => ({
      id: row.id,
      rank: row.rank,
      brandId: row.brandId,
      brandName: row.brand.canonicalName,
      parentCompanyName: row.brand.parentBrand?.canonicalName ?? null,
      score: row.score,
      appearanceRate: row.appearanceRate,
      avgRank: row.avgRank,
      modelCoverage: row.modelCoverage,
    }));
    boards[key] = {
      snapshots,
      prevRanks: Object.fromEntries(previousRows.map((row) => [row.brandId, row.rank])),
      hasPrevWeekData: previous.some((row) => row.engine === engine),
    };
  }

  return { week, boards };
}

async function verifyManifest(url: string, week: string) {
  const verificationUrl = new URL(url);
  verificationUrl.searchParams.set("verify", Date.now().toString());
  const response = await fetch(verificationUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Manifest verification returned ${response.status}`);
  const assessment = assessPublishedManifest(await response.json(), week);
  if (!assessment.ok) throw new Error(`Manifest verification failed: ${assessment.reason}`);
}

export async function publishLeaderboards(week: string): Promise<PublicationResult> {
  if (!canPublishToBlob()) {
    throw new Error(
      "Missing Blob credentials. Set BLOB_READ_WRITE_TOKEN locally, or connect Blob to this Vercel project (BLOB_STORE_ID + OIDC)."
    );
  }

  // Re-publishing a validated week must be idempotent so a transient latest failure
  // can be recovered without re-running collection or changing the week path.
  const jsonPut = blobPutOptions("application/json; charset=utf-8", {
    allowOverwrite: true,
  });
  const latestManifestPut = blobPutOptions("application/json; charset=utf-8", {
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
  const published: Record<string, string> = {};
  try {
    for (const category of Object.keys(CATEGORY_TO_SLUG)) {
      const data = await buildCategory(category, week);
      const slug = CATEGORY_TO_SLUG[category];
      const blob = await put(`leaderboards/${week}/${slug}.json`, JSON.stringify(data), jsonPut);
      published[slug] = blob.url;
    }
    const publishedAt = new Date().toISOString();
    const manifestBody = JSON.stringify({ version: 1, week, publishedAt, boards: published });
    const manifest = await put(`leaderboards/${week}/manifest.json`, manifestBody, jsonPut);
    // latest 是发布完成的提交点；写入失败时不能把本周标记为已发布。
    const latestManifest = await put("leaderboards/latest/manifest.json", manifestBody, latestManifestPut);
    await Promise.all([verifyManifest(manifest.url, week), verifyManifest(latestManifest.url, week)]);
    const result = { manifestUrl: manifest.url, latestManifestUrl: latestManifest.url, publishedAt };
    logPipelineEvent({ event: "publication_verified", week, boardCount: Object.keys(published).length, ...result });
    return result;
  } catch (error) {
    logPipelineEvent({ event: "publication_failed", week, error: errorContext(error) });
    throw error;
  }
}
