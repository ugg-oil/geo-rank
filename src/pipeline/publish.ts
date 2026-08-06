import { put } from "@vercel/blob";
import { canPublishToBlob, blobPutOptions } from "@/lib/blob-publish";
import { prisma } from "@/lib/db";
import { CATEGORY_TO_SLUG } from "@/lib/categories";
import {
  CATEGORIES,
  COLLECTION_ENGINES,
  SCORING_VERSION,
  weeklyPromptCount,
} from "@/lib/constants";
import { coverageExpansionEngines } from "@/lib/engine-scoring";
import { getPreviousWeek } from "@/lib/week";
import type { CategoryBoardsData, LeaderboardRow, LeaderboardView } from "@/lib/leaderboard-data";
import { assessPublishedManifest, type PublicationResult } from "@/lib/pipeline-health";
import { errorContext, logPipelineEvent } from "@/lib/pipeline-observability";
import { getCompanyColumnName, getProductDisplayName } from "@/lib/parent-company";
import { toBrandSlug } from "@/lib/brand-slug";
import { publishBrandPages } from "@/pipeline/publish-brands";

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
    ...new Set(previous.map((row) => row.engine).filter((engine): engine is string => Boolean(engine))),
  ];

  return {
    week,
    scoringVersion: SCORING_VERSION,
    collectedEngines: [...COLLECTION_ENGINES],
    scoringEngines,
    coverageExpansion: coverageExpansionEngines(scoringEngines, previousScoringEngines),
    boards,
  };
}

async function verifyManifest(url: string, week: string) {
  const verificationUrl = new URL(url);
  verificationUrl.searchParams.set("verify", Date.now().toString());
  const response = await fetch(verificationUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Manifest verification returned ${response.status}`);
  const assessment = assessPublishedManifest(await response.json(), week);
  if (!assessment.ok) throw new Error(`Manifest verification failed: ${assessment.reason}`);
}

export async function publishLeaderboards(
  week: string,
  options: { updateLatest?: boolean } = {}
): Promise<PublicationResult> {
  if (!canPublishToBlob()) {
    throw new Error(
      "Missing Blob credentials. Set BLOB_READ_WRITE_TOKEN locally, or connect Blob to this Vercel project (BLOB_STORE_ID + OIDC)."
    );
  }

  const jsonPut = blobPutOptions("application/json; charset=utf-8", {
    allowOverwrite: true,
  });
  const latestManifestPut = blobPutOptions("application/json; charset=utf-8", {
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
  const published: Record<string, string> = {};
  const scoringEngineUnion = new Set<string>();
  try {
    for (const category of Object.keys(CATEGORY_TO_SLUG)) {
      const data = await buildCategory(category, week);
      for (const engine of data.scoringEngines ?? []) scoringEngineUnion.add(engine);
      const slug = CATEGORY_TO_SLUG[category];
      const blob = await put(`leaderboards/${week}/${slug}.json`, JSON.stringify(data), jsonPut);
      published[slug] = blob.url;
    }
    const publishedAt = new Date().toISOString();
    const manifestBody = JSON.stringify({
      version: 2,
      week,
      publishedAt,
      boards: published,
      scoringVersion: SCORING_VERSION,
      collectedEngines: [...COLLECTION_ENGINES],
      scoringEngineUnion: [...scoringEngineUnion],
      promptCount: weeklyPromptCount(),
    });
    const manifest = await put(`leaderboards/${week}/manifest.json`, manifestBody, jsonPut);
    const snapshotCounts = await prisma.snapshot.groupBy({
      by: ["week"],
      _count: { id: true },
    });
    const weeks = snapshotCounts
      .filter((row) => row._count.id >= CATEGORIES.length * 4)
      .map((row) => row.week)
      .sort((a, b) => b.localeCompare(a));
    await put("leaderboards/index.json", JSON.stringify({ version: 1, weeks }), latestManifestPut);
    const updateLatest = options.updateLatest ?? true;
    const latestManifest = updateLatest
      ? await put("leaderboards/latest/manifest.json", manifestBody, latestManifestPut)
      : null;
    await verifyManifest(manifest.url, week);
    if (latestManifest) await verifyManifest(latestManifest.url, week);

    await publishBrandPages(week);

    const result = {
      manifestUrl: manifest.url,
      latestManifestUrl: latestManifest?.url ?? "",
      publishedAt,
    };
    logPipelineEvent({ event: "publication_verified", week, boardCount: Object.keys(published).length, ...result });
    return result;
  } catch (error) {
    logPipelineEvent({ event: "publication_failed", week, error: errorContext(error) });
    throw error;
  }
}
