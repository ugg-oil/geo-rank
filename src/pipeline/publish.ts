import { put } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { CATEGORY_TO_SLUG } from "@/lib/categories";
import { ENGINES } from "@/lib/constants";
import { getPreviousWeek } from "@/lib/week";
import type { CategoryBoardsData, LeaderboardRow, LeaderboardView } from "@/lib/leaderboard";

async function buildCategory(category: string, week: string): Promise<CategoryBoardsData> {
  const prevWeek = getPreviousWeek(week);
  const [current, previous] = await Promise.all([
    prisma.snapshot.findMany({
      where: { week, category },
      orderBy: { rank: "asc" },
      include: { brand: { select: { canonicalName: true } } },
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

export async function publishLeaderboards(week: string) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Missing BLOB_READ_WRITE_TOKEN; cannot publish leaderboard snapshots.");
  }

  const published: Record<string, string> = {};
  for (const category of Object.keys(CATEGORY_TO_SLUG)) {
    const data = await buildCategory(category, week);
    const slug = CATEGORY_TO_SLUG[category];
    const blob = await put(`leaderboards/${week}/${slug}.json`, JSON.stringify(data), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json; charset=utf-8",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    published[slug] = blob.url;
  }

  const publishedAt = new Date().toISOString();
  const manifestBody = JSON.stringify({
    version: 1,
    week,
    publishedAt,
    boards: published,
  });
  const manifest = await put(`leaderboards/${week}/manifest.json`, manifestBody, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json; charset=utf-8",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
  // latest 指向“当前周”。它失败时不阻断“本周 manifest”可用，避免整站回退到数据库。
  let latestManifestUrl: string | null = null;
  try {
    const latestManifest = await put("leaderboards/latest/manifest.json", manifestBody, {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json; charset=utf-8",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    latestManifestUrl = latestManifest.url;
  } catch (error) {
    console.error("[Publish] Failed to publish latest manifest:", error);
  }

  console.log(
    JSON.stringify(
      {
        week,
        manifest: manifest.url,
        latestManifest: latestManifestUrl,
        publishedAt,
        boards: published,
      },
      null,
      2
    )
  );
  return manifest.url;
}
