import { put } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { CATEGORY_TO_SLUG } from "@/lib/categories";
import { COLLECTION_ENGINES, SCORING_VERSION } from "@/lib/constants";
import { getCompanyColumnName, getProductDisplayName } from "@/lib/parent-company";
import { canPublishToBlob, blobPutOptions } from "@/lib/blob-publish";
import { logPipelineEvent } from "@/lib/pipeline-observability";
import { publishCompanyPages } from "@/pipeline/publish-companies";
import type { BrandPageData, BrandPageCategoryEntry, BrandPageEngineEntry } from "@/lib/brand-page";

/**
 * Build brand page data for every brand that has snapshots in this week.
 * Reads from the same Snapshot table used by the leaderboard publisher,
 * so numbers are guaranteed to match.
 */
export async function buildBrandPages(week: string) {
  // All brands with overall snapshots this week
  const brands = await prisma.snapshot.findMany({
    where: { week, engine: null },
    select: {
      brandId: true,
      category: true,
      rank: true,
      score: true,
      appearanceRate: true,
      brand: {
        select: {
          canonicalName: true,
          parentBrand: { select: { canonicalName: true } },
        },
      },
    },
  });

  // Engine-level snapshots for engine breakdowns
  const engineSnapshots = await prisma.snapshot.findMany({
    where: { week, engine: { not: null } },
    select: {
      brandId: true,
      category: true,
      engine: true,
      rank: true,
      score: true,
    },
  });

  // Index engine data by brandId + category
  const engineMap = new Map<string, Map<string, Record<string, BrandPageEngineEntry>>>();
  for (const s of engineSnapshots) {
    if (!engineMap.has(s.brandId)) engineMap.set(s.brandId, new Map());
    const catMap = engineMap.get(s.brandId)!;
    if (!catMap.has(s.category)) catMap.set(s.category, {});
    catMap.get(s.category)![s.engine!] = { rank: s.rank, score: s.score };
  }

  // Group overall snapshots by brand
  const brandMap = new Map<string, {
    canonicalName: string;
    parentCompany: string | null;
    categories: { category: string; rank: number; score: number; appearanceRate: number }[];
  }>();

  for (const s of brands) {
    if (!brandMap.has(s.brandId)) {
      const parentCompany = getCompanyColumnName(
        s.brand.canonicalName,
        s.brand.parentBrand?.canonicalName
      );
      brandMap.set(s.brandId, {
        canonicalName: s.brand.canonicalName,
        parentCompany,
        categories: [],
      });
    }
    brandMap.get(s.brandId)!.categories.push({
      category: s.category,
      rank: s.rank,
      score: s.score,
      appearanceRate: s.appearanceRate,
    });
  }

  const slugMap = CATEGORY_TO_SLUG;
  const brandPages: BrandPageData[] = [];
  const brandIndex: Record<string, { name: string; parentCompany: string | null }> = {};

  for (const [brandId, info] of brandMap) {
    const displayName = getProductDisplayName(info.canonicalName);

    const categories: BrandPageCategoryEntry[] = info.categories
      .filter((c) => slugMap[c.category] !== undefined)
      .map((c) => ({
        slug: slugMap[c.category],
        rank: c.rank,
        score: c.score,
        mentionFrequency: c.appearanceRate,
        engines: engineMap.get(brandId)?.get(c.category) ?? {},
      }));

    const slug = displayName
      .toLowerCase()
      .replace(/[''']/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    brandIndex[slug] = {
      name: displayName,
      parentCompany: info.parentCompany,
    };

    brandPages.push({
      schemaVersion: 1,
      scoringVersion: SCORING_VERSION,
      week,
      slug,
      name: displayName,
      parentCompany: info.parentCompany,
      updatedAt: new Date().toISOString().split("T")[0],
      collectedEngines: [...COLLECTION_ENGINES],
      categories,
    });
  }

  return { brandPages, brandIndex };
}

/**
 * Publish brand page data to Blob.
 * - brands/index.json: slug → { name, parentCompany }
 * - brands/{slug}/{week}.json: full brand page data
 */
export async function publishBrandPages(week: string) {
  if (!canPublishToBlob()) {
    logPipelineEvent({ event: "brand_publish_skipped", week, reason: "no blob credentials" });
    return;
  }

  const { brandPages, brandIndex } = await buildBrandPages(week);

  const jsonPut = blobPutOptions("application/json; charset=utf-8", {
    allowOverwrite: true,
  });

  // Write individual brand page files
  for (const page of brandPages) {
    await put(
      `brands/${page.slug}/${week}.json`,
      JSON.stringify(page),
      jsonPut
    );
  }

  // Write index
  await put(
    "brands/index.json",
    JSON.stringify(brandIndex),
    jsonPut
  );

  logPipelineEvent({
    event: "brand_pages_published",
    week,
    brandCount: brandPages.length,
  });

  await publishCompanyPages(week, brandPages);
}
