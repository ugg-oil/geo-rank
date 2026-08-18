import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CATEGORY_SLUG_MAP, CATEGORY_TO_SLUG } from "@/lib/categories";
import { COLLECTION_ENGINES, SCORING_VERSION } from "@/lib/constants";
import { selectBrandExcerpts } from "@/lib/brand-excerpts";
import { resolveBrandBySlug, resolveBrandIdBySlug } from "@/lib/brand-resolve";
import { toBrandSlug } from "@/lib/brand-slug";
import { evaluateLayerB } from "@/lib/brand-layer-b";
import {
  buildBrandCategoryHistories,
  type BrandCategoryHistory,
} from "@/lib/brand-history-data";
import { getCompanyColumnName, getProductDisplayName } from "@/lib/parent-company";
import { findPreviousPublishedPeriod } from "@/lib/period-sequence";
import { getPublishedLeaderboardWeeks } from "@/lib/published-leaderboard";
import { selectSimilarBrands, type SimilarBrandCandidate } from "@/lib/similar-brands";
import { ttlCache } from "@/lib/ttl-cache";
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

type SnapshotRow = {
  week: string;
  category: string;
  engine: string | null;
  rank: number;
  score: number;
  appearanceRate: number;
};

/** Best engine rank per category — used when a brand has engine boards but no overall row. */
function bestEngineRowByCategory(rows: SnapshotRow[]): {
  category: string;
  engine: string;
  rank: number;
  score: number;
  appearanceRate: number;
}[] {
  const best = new Map<string, SnapshotRow>();
  for (const row of rows) {
    if (!row.engine) continue;
    const prev = best.get(row.category);
    if (!prev || row.rank < prev.rank) best.set(row.category, row);
  }
  return [...best.values()].map((row) => ({
    category: row.category,
    engine: row.engine!,
    rank: row.rank,
    score: row.score,
    appearanceRate: row.appearanceRate,
  }));
}

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

function toBrandPage(
  week: string,
  slug: string,
  info: BrandBuildInfo,
  engineMap: Map<string, Map<string, Record<string, BrandPageEngineEntry>>>,
  mentionIndex: Map<
    string,
    Map<string, Map<string, { responseId: string; rawText: string; position: number }[]>>
  >,
  brandId: string
): BrandPageData {
  const displayName = getProductDisplayName(info.canonicalName);
  const matchNames = [displayName, info.canonicalName, ...info.aliases];
  const categories: BrandPageCategoryEntry[] = info.categories
    .filter((c) => CATEGORY_TO_SLUG[c.category] !== undefined)
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
        slug: CATEGORY_TO_SLUG[c.category]!,
        rank: c.rank,
        score: c.score,
        mentionFrequency: c.appearanceRate,
        engines,
        ...(Object.keys(engineExcerpts).length > 0 ? { engineExcerpts } : {}),
      };
    });

  return {
    schemaVersion: 2,
    scoringVersion: SCORING_VERSION,
    week,
    slug,
    name: displayName,
    parentCompany: info.parentCompany,
    updatedAt: new Date().toISOString().split("T")[0]!,
    collectedEngines: [...COLLECTION_ENGINES],
    categories,
  };
}

/**
 * Rank/engine shell only. Excerpts are `loadBrandExcerptsForPage` (Suspense).
 */
export async function buildBrandPageForSlug(
  week: string,
  slug: string
): Promise<BrandPageData | null> {
  const brandId = await resolveBrandIdBySlug(slug);
  if (!brandId) return null;

  const [brand, snaps] = await Promise.all([
    prisma.brand.findUnique({
      where: { id: brandId },
      select: {
        canonicalName: true,
        parentBrand: { select: { canonicalName: true } },
      },
    }),
    prisma.snapshot.findMany({
      where: { week, brandId },
      select: {
        category: true,
        engine: true,
        rank: true,
        score: true,
        appearanceRate: true,
      },
    }),
  ]);
  const overalls = snaps.filter((row) => row.engine == null);
  const engineSnapshots = snaps.filter((row) => row.engine != null);
  if (!brand || overalls.length === 0) return null;

  const info: BrandBuildInfo = {
    canonicalName: brand.canonicalName,
    parentCompany: getCompanyColumnName(
      brand.canonicalName,
      brand.parentBrand?.canonicalName
    ),
    aliases: [],
    categories: overalls.map((s) => ({
      category: s.category,
      rank: s.rank,
      score: s.score,
      appearanceRate: s.appearanceRate,
    })),
  };

  const engineMap = new Map<string, Map<string, Record<string, BrandPageEngineEntry>>>();
  engineMap.set(brandId, new Map());
  const catMap = engineMap.get(brandId)!;
  for (const s of engineSnapshots) {
    if (!catMap.has(s.category)) catMap.set(s.category, {});
    catMap.get(s.category)![s.engine!] = { rank: s.rank, score: s.score };
  }

  return toBrandPage(week, slug, info, engineMap, new Map(), brandId);
}

export type BrandPageBundle = {
  data: BrandPageData;
  histories: BrandCategoryHistory[];
  similarByCategory: Record<string, SimilarBrandCandidate[]>;
  layerB: ReturnType<typeof evaluateLayerB>;
};

/**
 * Brand shell in two DB waves (resolve+weeks, then brand snaps + overall Top 20).
 * Similar engine rows are a third wave only when neighbors exist.
 */
export async function loadBrandPageBundle(
  slug: string,
  requestedWeek?: string
): Promise<BrandPageBundle | null> {
  const ref = await resolveBrandBySlug(slug);
  if (!ref) return null;
  const snaps = await prisma.snapshot.findMany({
    where: { brandId: ref.id },
    select: {
      week: true,
      category: true,
      engine: true,
      rank: true,
      score: true,
      appearanceRate: true,
    },
  });

  const overallByWeek = snaps.filter((row) => row.engine == null);
  const engineByWeek = snaps.filter((row) => row.engine != null);
  const snapWeeks = [
    ...new Set([...overallByWeek, ...engineByWeek].map((row) => row.week)),
  ].sort((a, b) => b.localeCompare(a));
  if (snapWeeks.length === 0) return null;

  const requested =
    requestedWeek && /^\d{4}-\d{2}-\d{2}$/.test(requestedWeek)
      ? `Week of ${requestedWeek}`
      : requestedWeek && snapWeeks.includes(requestedWeek)
        ? requestedWeek
        : snapWeeks[0]!;

  let selectedWeek = requested;
  if (!snapWeeks.includes(selectedWeek) && !requestedWeek) {
    selectedWeek = snapWeeks[0] ?? "";
  }

  const engineSnapshots = snaps.filter(
    (row) => row.week === selectedWeek && row.engine != null
  );
  const realOveralls = overallByWeek.filter((row) => row.week === selectedWeek);
  const synthesized =
    realOveralls.length === 0 && engineSnapshots.length > 0
      ? bestEngineRowByCategory(engineSnapshots)
      : [];
  const overalls =
    realOveralls.length > 0
      ? realOveralls
      : synthesized.map((row) => ({
          week: selectedWeek,
          category: row.category,
          engine: null as string | null,
          rank: row.rank,
          score: row.score,
          appearanceRate: row.appearanceRate,
        }));
  if (!selectedWeek || overalls.length === 0) return null;

  const bestEngineByCategory = new Map(
    synthesized.map((row) => [row.category, row.engine] as const)
  );

  const info: BrandBuildInfo = {
    canonicalName: ref.canonicalName,
    parentCompany: getCompanyColumnName(ref.canonicalName, ref.parentCanonicalName),
    aliases: [],
    categories: overalls.map((row) => ({
      category: row.category,
      rank: row.rank,
      score: row.score,
      appearanceRate: row.appearanceRate,
    })),
  };
  const engineMap = new Map<string, Map<string, Record<string, BrandPageEngineEntry>>>();
  engineMap.set(ref.id, new Map());
  const catMap = engineMap.get(ref.id)!;
  for (const row of engineSnapshots) {
    if (!catMap.has(row.category)) catMap.set(row.category, {});
    catMap.get(row.category)![row.engine!] = { rank: row.rank, score: row.score };
  }
  const data = toBrandPage(selectedWeek, slug, info, engineMap, new Map(), ref.id);

  for (const entry of data.categories) {
    const categoryName = CATEGORY_SLUG_MAP[entry.slug];
    const bestEngine = categoryName ? bestEngineByCategory.get(categoryName) : undefined;
    if (bestEngine) {
      entry.rankSource = "best_engine";
      entry.bestEngine = bestEngine;
    } else {
      entry.rankSource = "overall";
    }
  }

  // P3-4: previous-period overall rank per category for Δ badges.
  await Promise.all(
    data.categories.map(async (entry) => {
      const categoryName = CATEGORY_SLUG_MAP[entry.slug];
      if (!categoryName) {
        entry.hasPrevPeriod = false;
        entry.prevRank = null;
        return;
      }
      const prevWeek = await findPreviousPublishedPeriod(categoryName, selectedWeek);
      if (!prevWeek) {
        entry.hasPrevPeriod = false;
        entry.prevRank = null;
        return;
      }
      entry.hasPrevPeriod = true;
      const prevSnap = overallByWeek.find(
        (row) => row.week === prevWeek && row.category === categoryName
      );
      entry.prevRank = prevSnap?.rank ?? null;
    })
  );

  const boardsByWeek: Record<
    string,
    Record<string, { brandSlug: string; rank: number; score: number }[]>
  > = {};
  const layerBoards: Record<string, Record<string, { brandSlug: string }[]>> = {};
  for (const row of overallByWeek) {
    const categorySlug = CATEGORY_TO_SLUG[row.category];
    if (!categorySlug) continue;
    boardsByWeek[row.week] ??= {};
    boardsByWeek[row.week][categorySlug] ??= [];
    boardsByWeek[row.week][categorySlug].push({
      brandSlug: slug,
      rank: row.rank,
      score: row.score,
    });
    layerBoards[row.week] ??= {};
    layerBoards[row.week][categorySlug] ??= [];
    layerBoards[row.week][categorySlug].push({ brandSlug: slug });
  }
  // Engine-only appearances (no overall row that week) still feed rank history.
  for (const row of engineByWeek) {
    const categorySlug = CATEGORY_TO_SLUG[row.category];
    if (!categorySlug) continue;
    const weekBoard = boardsByWeek[row.week]?.[categorySlug];
    if (weekBoard?.some((entry) => entry.brandSlug === slug)) continue;
    boardsByWeek[row.week] ??= {};
    boardsByWeek[row.week][categorySlug] ??= [];
    boardsByWeek[row.week][categorySlug].push({
      brandSlug: slug,
      rank: row.rank,
      score: row.score,
    });
    layerBoards[row.week] ??= {};
    layerBoards[row.week][categorySlug] ??= [];
    if (!layerBoards[row.week][categorySlug]!.some((entry) => entry.brandSlug === slug)) {
      layerBoards[row.week][categorySlug].push({ brandSlug: slug });
    }
  }

  const wantedNames = data.categories
    .map((entry) => CATEGORY_SLUG_MAP[entry.slug])
    .filter((name): name is string => Boolean(name));
  const similarSnaps =
    wantedNames.length === 0
      ? []
      : await prisma.snapshot.findMany({
          where: {
            week: selectedWeek,
            category: { in: wantedNames },
            rank: { lte: 20 },
          },
          select: {
            category: true,
            engine: true,
            rank: true,
            score: true,
            brand: { select: { canonicalName: true } },
          },
        });

  type SimilarBoard = {
    snapshots: { brandSlug: string; brandName: string; rank: number; score: number }[];
  };
  const byCategory = new Map<
    string,
    { overall: SimilarBoard; engines: Record<string, SimilarBoard> }
  >();
  for (const name of wantedNames) {
    byCategory.set(name, { overall: { snapshots: [] }, engines: {} });
  }
  for (const snap of similarSnaps) {
    const bucket = byCategory.get(snap.category);
    if (!bucket) continue;
    const brandName = getProductDisplayName(snap.brand.canonicalName);
    const row = {
      brandSlug: toBrandSlug(brandName),
      brandName,
      rank: snap.rank,
      score: snap.score,
    };
    if (!snap.engine) {
      bucket.overall.snapshots.push(row);
      continue;
    }
    bucket.engines[snap.engine] ??= { snapshots: [] };
    bucket.engines[snap.engine].snapshots.push(row);
  }

  const similarByCategory: Record<string, SimilarBrandCandidate[]> = {};
  for (const entry of data.categories) {
    const name = CATEGORY_SLUG_MAP[entry.slug];
    const bucket = name ? byCategory.get(name) : undefined;
    similarByCategory[entry.slug] = bucket
      ? selectSimilarBrands(slug, bucket.overall, bucket.engines)
      : [];
  }

  const weeks = await getPublishedLeaderboardWeeks();
  const histories = buildBrandCategoryHistories(
    slug,
    (weeks.length > 0 ? weeks : snapWeeks).slice().reverse(),
    boardsByWeek
  );
  const layerB = evaluateLayerB(slug, weeks.length > 0 ? weeks : snapWeeks, layerBoards);

  return { data, histories, similarByCategory, layerB };
}

export type BrandExcerptGroup = {
  categorySlug: string;
  engine: string;
  text: string;
};

/** Slow path: a few rawText rows per engine. Stream behind Suspense. */
export async function loadBrandExcerptsForPage(
  week: string,
  slug: string
): Promise<BrandExcerptGroup[]> {
  return ttlCache(`excerpts:${week}:${slug}`, 60_000, () =>
    loadBrandExcerptsUncached(week, slug)
  );
}

async function loadBrandExcerptsUncached(
  week: string,
  slug: string
): Promise<BrandExcerptGroup[]> {
  const brandId = await resolveBrandIdBySlug(slug);
  if (!brandId) return [];

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: {
      canonicalName: true,
      aliases: { select: { alias: true } },
    },
  });
  const overalls = await prisma.snapshot.findMany({
    where: { week, brandId, engine: null },
    select: { category: true },
  });
  if (!brand || overalls.length === 0) return [];

  const categories = [...new Set(overalls.map((row) => row.category))];
  const mentionRows =
    categories.length === 0
      ? []
      : await prisma.$queryRaw<
          Array<{
            responseId: string;
            position: number;
            category: string;
            engine: string;
          }>
        >(Prisma.sql`
          SELECT rm.response_id AS "responseId", rm.position, r.category, r.engine
          FROM resolved_mentions rm
          INNER JOIN responses r ON r.id = rm.response_id
          WHERE rm.brand_id = ${brandId}
            AND r.week = ${week}
            AND r.status = 'ok'
            AND r.category IN (${Prisma.join(categories)})
        `);

  const responseMeta = mentionRows.map((row) => ({
    id: row.responseId,
    category: row.category,
    engine: row.engine,
  }));
  const mentions = mentionRows.map((row) => ({
    responseId: row.responseId,
    position: row.position,
  }));
  const excerptIds = pickExcerptResponseIds(mentions, responseMeta, 3);
  const responses =
    excerptIds.length === 0
      ? []
      : await prisma.response.findMany({
          where: { id: { in: excerptIds } },
          select: { id: true, category: true, engine: true, rawText: true },
        });

  const displayName = getProductDisplayName(brand.canonicalName);
  const matchNames = [displayName, brand.canonicalName, ...brand.aliases.map((a) => a.alias)];
  const groups: BrandExcerptGroup[] = [];
  const byCatEngine = new Map<string, { responseId: string; rawText: string; position: number }[]>();
  const positionByResponse = new Map(mentions.map((m) => [m.responseId, m.position]));
  for (const response of responses) {
    if (!response.rawText) continue;
    const key = `${response.category}::${response.engine}`;
    const list = byCatEngine.get(key) ?? [];
    list.push({
      responseId: response.id,
      rawText: response.rawText,
      position: positionByResponse.get(response.id) ?? 99,
    });
    byCatEngine.set(key, list);
  }
  for (const [key, candidates] of byCatEngine) {
    const [category, engine] = key.split("::");
    const categorySlug = CATEGORY_TO_SLUG[category ?? ""];
    if (!categorySlug || !engine) continue;
    const selected = selectBrandExcerpts(candidates, matchNames);
    if (selected[0]) {
      groups.push({ categorySlug, engine, text: selected[0] });
    }
  }
  groups.sort(
    (a, b) =>
      a.categorySlug.localeCompare(b.categorySlug) || a.engine.localeCompare(b.engine)
  );
  return groups;
}

function pickExcerptResponseIds(
  mentions: { responseId: string; position: number }[],
  responseMeta: { id: string; category: string; engine: string }[],
  perEngine: number
): string[] {
  const meta = new Map(responseMeta.map((row) => [row.id, row]));
  const buckets = new Map<string, { responseId: string; position: number }[]>();
  for (const mention of mentions) {
    const row = meta.get(mention.responseId);
    if (!row) continue;
    const key = `${row.category}::${row.engine}`;
    const list = buckets.get(key) ?? [];
    list.push({ responseId: mention.responseId, position: mention.position });
    buckets.set(key, list);
  }
  const ids: string[] = [];
  for (const list of buckets.values()) {
    list.sort(
      (a, b) => a.position - b.position || a.responseId.localeCompare(b.responseId)
    );
    for (const row of list.slice(0, perEngine)) ids.push(row.responseId);
  }
  return [...new Set(ids)];
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
