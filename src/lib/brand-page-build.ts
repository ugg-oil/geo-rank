import { prisma } from "@/lib/db";
import { CATEGORY_TO_SLUG } from "@/lib/categories";
import { COLLECTION_ENGINES, SCORING_VERSION } from "@/lib/constants";
import { selectBrandExcerpts } from "@/lib/brand-excerpts";
import { toBrandSlug } from "@/lib/brand-slug";
import { getCompanyColumnName, getProductDisplayName } from "@/lib/parent-company";
import type {
  BrandIndex,
  BrandPageCategoryEntry,
  BrandPageData,
  BrandPageEngineEntry,
} from "@/lib/brand-page";

type BrandBuildInfo = {
  canonicalName: string;
  parentCompany: string | null;
  aliases: string[];
  categories: { category: string; rank: number; score: number; appearanceRate: number }[];
};

/**
 * Build brand page data for every brand that has snapshots in this week.
 * Shared by publish-brands (Blob mirror) and DB-first brand / company reads.
 */
export async function buildBrandPages(week: string): Promise<{
  brandPages: BrandPageData[];
  brandIndex: BrandIndex;
}> {
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
          aliases: { select: { alias: true } },
        },
      },
    },
  });

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

  const engineMap = new Map<string, Map<string, Record<string, BrandPageEngineEntry>>>();
  for (const s of engineSnapshots) {
    if (!engineMap.has(s.brandId)) engineMap.set(s.brandId, new Map());
    const catMap = engineMap.get(s.brandId)!;
    if (!catMap.has(s.category)) catMap.set(s.category, {});
    catMap.get(s.category)![s.engine!] = { rank: s.rank, score: s.score };
  }

  const brandMap = new Map<string, BrandBuildInfo>();

  for (const s of brands) {
    if (!brandMap.has(s.brandId)) {
      const parentCompany = getCompanyColumnName(
        s.brand.canonicalName,
        s.brand.parentBrand?.canonicalName
      );
      brandMap.set(s.brandId, {
        canonicalName: s.brand.canonicalName,
        parentCompany,
        aliases: s.brand.aliases.map((a) => a.alias),
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

  const brandIds = [...brandMap.keys()];
  const categoriesInPlay = [
    ...new Set(
      [...brandMap.values()].flatMap((info) => info.categories.map((c) => c.category))
    ),
  ];

  const responses =
    brandIds.length === 0
      ? []
      : await prisma.response.findMany({
          where: {
            week,
            status: "ok",
            category: { in: categoriesInPlay },
            rawText: { not: null },
          },
          select: { id: true, category: true, engine: true, rawText: true },
        });

  const responseById = new Map(responses.map((r) => [r.id, r]));
  const mentions =
    responses.length === 0
      ? []
      : await prisma.resolvedMention.findMany({
          where: {
            brandId: { in: brandIds },
            responseId: { in: responses.map((r) => r.id) },
          },
          select: { brandId: true, responseId: true, position: true },
        });

  const mentionIndex = new Map<
    string,
    Map<string, Map<string, { responseId: string; rawText: string; position: number }[]>>
  >();

  for (const mention of mentions) {
    const response = responseById.get(mention.responseId);
    if (!response?.rawText) continue;
    if (!mentionIndex.has(mention.brandId)) mentionIndex.set(mention.brandId, new Map());
    const byCat = mentionIndex.get(mention.brandId)!;
    if (!byCat.has(response.category)) byCat.set(response.category, new Map());
    const byEngine = byCat.get(response.category)!;
    if (!byEngine.has(response.engine)) byEngine.set(response.engine, []);
    byEngine.get(response.engine)!.push({
      responseId: response.id,
      rawText: response.rawText,
      position: mention.position,
    });
  }

  const slugMap = CATEGORY_TO_SLUG;
  const brandPages: BrandPageData[] = [];
  const brandIndex: BrandIndex = {};

  for (const [brandId, info] of brandMap) {
    const displayName = getProductDisplayName(info.canonicalName);
    const matchNames = [displayName, info.canonicalName, ...info.aliases];
    const slug = toBrandSlug(displayName);

    const categories: BrandPageCategoryEntry[] = info.categories
      .filter((c) => slugMap[c.category] !== undefined)
      .map((c) => {
        const engines = engineMap.get(brandId)?.get(c.category) ?? {};
        const engineExcerpts: Record<string, string[]> = {};
        const byEngine = mentionIndex.get(brandId)?.get(c.category);
        if (byEngine) {
          for (const [engine, candidates] of byEngine) {
            const selected = selectBrandExcerpts(candidates, matchNames);
            if (selected.length > 0) engineExcerpts[engine] = selected;
          }
        }
        return {
          slug: slugMap[c.category]!,
          rank: c.rank,
          score: c.score,
          mentionFrequency: c.appearanceRate,
          engines,
          ...(Object.keys(engineExcerpts).length > 0 ? { engineExcerpts } : {}),
        };
      });

    brandIndex[slug] = {
      name: displayName,
      parentCompany: info.parentCompany,
    };

    brandPages.push({
      schemaVersion: 2,
      scoringVersion: SCORING_VERSION,
      week,
      slug,
      name: displayName,
      parentCompany: info.parentCompany,
      updatedAt: new Date().toISOString().split("T")[0]!,
      collectedEngines: [...COLLECTION_ENGINES],
      categories,
    });
  }

  return { brandPages, brandIndex };
}

/** Index only (no excerpts) — cheaper for Layer B / company child lookup. */
export async function buildBrandIndexFromDb(week: string): Promise<BrandIndex> {
  const brands = await prisma.snapshot.findMany({
    where: { week, engine: null },
    select: {
      brandId: true,
      brand: {
        select: {
          canonicalName: true,
          parentBrand: { select: { canonicalName: true } },
        },
      },
    },
  });

  const index: BrandIndex = {};
  const seen = new Set<string>();
  for (const s of brands) {
    if (seen.has(s.brandId)) continue;
    seen.add(s.brandId);
    const displayName = getProductDisplayName(s.brand.canonicalName);
    const slug = toBrandSlug(displayName);
    index[slug] = {
      name: displayName,
      parentCompany: getCompanyColumnName(
        s.brand.canonicalName,
        s.brand.parentBrand?.canonicalName
      ),
    };
  }
  return index;
}
