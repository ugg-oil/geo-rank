import { put } from "@vercel/blob";
import {
  blobMirrorSkipReason,
  blobPutOptions,
} from "@/lib/blob-publish";
import { prisma } from "@/lib/db";
import { CATEGORY_TO_SLUG } from "@/lib/categories";
import {
  COLLECTION_ENGINES,
  SCORING_VERSION,
  weeklyPromptCount,
} from "@/lib/constants";
import { buildCategoryBoardsFromDb } from "@/lib/leaderboard";
import { assessPublishedManifest, type PublicationResult } from "@/lib/pipeline-health";
import { errorContext, logPipelineEvent } from "@/lib/pipeline-observability";
import { publishBrandPages } from "@/pipeline/publish-brands";

async function verifyManifest(
  url: string,
  week: string,
  options: { requireAllBoards?: boolean; requiredSlugs?: string[] } = {}
) {
  const verificationUrl = new URL(url);
  verificationUrl.searchParams.set("verify", Date.now().toString());
  const response = await fetch(verificationUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Manifest verification returned ${response.status}`);
  const assessment = assessPublishedManifest(await response.json(), week, options);
  if (!assessment.ok) throw new Error(`Manifest verification failed: ${assessment.reason}`);
}

async function readLatestBoards(): Promise<Record<string, string>> {
  const manifestUrl = process.env.LEADERBOARD_MANIFEST_URL;
  if (!manifestUrl) return {};
  try {
    const response = await fetch(manifestUrl, { cache: "no-store" });
    if (!response.ok) return {};
    const manifest = (await response.json()) as { boards?: Record<string, string> };
    return manifest.boards ?? {};
  } catch {
    return {};
  }
}

/**
 * Ensure DB boards exist for the week, then optionally mirror to Blob.
 * Blob mirror is opt-in (`PUBLISH_BLOB_MIRROR=1`); default skips puts.
 * Blob unavailable / put failure → soft-fail (DB remains SoT); does not throw.
 * Throws only when no category snapshots exist for `week`.
 */
export async function publishLeaderboards(
  week: string,
  options: { updateLatest?: boolean } = {}
): Promise<PublicationResult> {
  const publishedAt = new Date().toISOString();
  const boardsBySlug: Record<string, Awaited<ReturnType<typeof buildCategoryBoardsFromDb>>> = {};
  const scoringEngineUnion = new Set<string>();

  for (const category of Object.keys(CATEGORY_TO_SLUG)) {
    const data = await buildCategoryBoardsFromDb(category, week);
    if (!data) {
      logPipelineEvent({
        event: "publication_skip_category",
        week,
        category,
        reason: "no_snapshots_for_period",
      });
      continue;
    }
    for (const engine of data.scoringEngines ?? []) scoringEngineUnion.add(engine);
    boardsBySlug[CATEGORY_TO_SLUG[category]!] = data;
  }

  if (Object.keys(boardsBySlug).length === 0) {
    throw new Error(`No category boards to publish for ${week}`);
  }

  const skipReason = blobMirrorSkipReason();
  if (skipReason) {
    console.log(
      `[publish] Blob mirror skipped (${skipReason}); DB snapshots remain published SoT`
    );
    logPipelineEvent({
      event: "publication_blob_skipped",
      week,
      reason: skipReason,
      boardCount: Object.keys(boardsBySlug).length,
    });
    return {
      manifestUrl: null,
      latestManifestUrl: null,
      publishedAt,
      publishStatus: "skipped",
    };
  }

  const jsonPut = blobPutOptions("application/json; charset=utf-8", {
    allowOverwrite: true,
  });
  const latestManifestPut = blobPutOptions("application/json; charset=utf-8", {
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });

  try {
    const published: Record<string, string> = {};
    for (const [slug, data] of Object.entries(boardsBySlug)) {
      const blob = await put(
        `leaderboards/${week}/${slug}.json`,
        JSON.stringify(data),
        jsonPut
      );
      published[slug] = blob.url;
    }

    const weekManifestBody = JSON.stringify({
      version: 2,
      week,
      publishedAt,
      boards: published,
      scoringVersion: SCORING_VERSION,
      collectedEngines: [...COLLECTION_ENGINES],
      scoringEngineUnion: [...scoringEngineUnion],
      promptCount: weeklyPromptCount(),
    });
    const manifest = await put(`leaderboards/${week}/manifest.json`, weekManifestBody, jsonPut);
    const snapshotCounts = await prisma.snapshot.groupBy({
      by: ["week"],
      _count: { id: true },
    });
    const weeks = snapshotCounts
      .filter((row) => row._count.id >= 4)
      .map((row) => row.week)
      .sort((a, b) => b.localeCompare(a));
    await put("leaderboards/index.json", JSON.stringify({ version: 1, weeks }), latestManifestPut);
    const updateLatest = options.updateLatest ?? true;
    let latestManifest: { url: string } | null = null;
    let previousLatestBoards: Record<string, string> = {};
    if (updateLatest) {
      previousLatestBoards = await readLatestBoards();
      const mergedBoards = { ...previousLatestBoards, ...published };
      const latestBody = JSON.stringify({
        version: 2,
        week,
        publishedAt,
        boards: mergedBoards,
        scoringVersion: SCORING_VERSION,
        collectedEngines: [...COLLECTION_ENGINES],
        scoringEngineUnion: [...scoringEngineUnion],
        promptCount: weeklyPromptCount(),
      });
      latestManifest = await put("leaderboards/latest/manifest.json", latestBody, latestManifestPut);
    }
    await verifyManifest(manifest.url, week, { requireAllBoards: false });
    if (latestManifest) {
      await verifyManifest(latestManifest.url, week, {
        requireAllBoards: true,
        requiredSlugs: Object.keys(previousLatestBoards),
      });
    }

    await publishBrandPages(week);

    const result: PublicationResult = {
      manifestUrl: manifest.url,
      latestManifestUrl: latestManifest?.url ?? null,
      publishedAt,
      publishStatus: "success",
    };
    logPipelineEvent({
      event: "publication_verified",
      week,
      boardCount: Object.keys(published).length,
      ...result,
    });
    return result;
  } catch (error) {
    const details = errorContext(error);
    logPipelineEvent({
      event: "publication_failed_mirror",
      week,
      boardCount: Object.keys(boardsBySlug).length,
      error: details,
    });
    return {
      manifestUrl: null,
      latestManifestUrl: null,
      publishedAt,
      publishStatus: "failed_mirror",
      publishError: details.message,
    };
  }
}
