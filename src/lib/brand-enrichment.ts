import { cache } from "react";
import { CATEGORY_SLUG_MAP, CATEGORY_TO_SLUG } from "@/lib/categories";
import { evaluateLayerB } from "@/lib/brand-layer-b";
import { getBrandIndex } from "@/lib/brand-page";
import { resolveBrandIdBySlug } from "@/lib/brand-resolve";
import { toBrandSlug } from "@/lib/brand-slug";
import { prisma } from "@/lib/db";
import { getProductDisplayName } from "@/lib/parent-company";
import { getPublishedLeaderboardWeeks } from "@/lib/published-leaderboard";
import { selectSimilarBrands, type SimilarBrandCandidate } from "@/lib/similar-brands";
import { ttlCache } from "@/lib/ttl-cache";

async function loadOverallRowsByWeek(weeks: string[]) {
  const snaps = await prisma.snapshot.findMany({
    where: { engine: null, week: { in: weeks } },
    select: {
      week: true,
      category: true,
      brand: { select: { canonicalName: true } },
    },
  });
  const boardsByWeek: Record<string, Record<string, { brandSlug: string }[]>> = {};
  for (const s of snaps) {
    const categorySlug = CATEGORY_TO_SLUG[s.category];
    if (!categorySlug) continue;
    const brandSlug = toBrandSlug(getProductDisplayName(s.brand.canonicalName));
    boardsByWeek[s.week] ??= {};
    boardsByWeek[s.week][categorySlug] ??= [];
    boardsByWeek[s.week][categorySlug].push({ brandSlug });
  }
  return boardsByWeek;
}

export const getBrandLayerBStatus = cache(async (slug: string) => {
  return ttlCache(`layer-b:${slug}`, 60_000, async () => {
    const [weeks, brandId] = await Promise.all([
      getPublishedLeaderboardWeeks(),
      resolveBrandIdBySlug(slug),
    ]);
    if (weeks.length === 0 || !brandId) {
      return { layerB: false as const, consecutiveLayerA: 0, windowWeeks: [] as string[] };
    }
    const recent = weeks.slice(0, 4);
    const snaps = await prisma.snapshot.findMany({
      where: { engine: null, week: { in: recent }, brandId },
      select: { week: true, category: true },
    });
    const boardsByWeek: Record<string, Record<string, { brandSlug: string }[]>> = {};
    for (const s of snaps) {
      const categorySlug = CATEGORY_TO_SLUG[s.category];
      if (!categorySlug) continue;
      boardsByWeek[s.week] ??= {};
      boardsByWeek[s.week][categorySlug] ??= [];
      boardsByWeek[s.week][categorySlug].push({ brandSlug: slug });
    }
    return evaluateLayerB(slug, weeks, boardsByWeek);
  });
});

export async function getLayerBBrandSlugs(): Promise<string[]> {
  const [weeks, index] = await Promise.all([
    getPublishedLeaderboardWeeks(),
    getBrandIndex(),
  ]);
  if (weeks.length < 4) return [];

  const boardsByWeek = await loadOverallRowsByWeek(weeks.slice(0, 4));
  return Object.keys(index)
    .filter((slug) => evaluateLayerB(slug, weeks, boardsByWeek).layerB)
    .sort();
}

type SimilarBoard = {
  snapshots: { brandSlug: string; brandName: string; rank: number; score: number }[];
};

async function loadSimilarBrandsForBrand(
  slug: string,
  categorySlugs: string[]
): Promise<Record<string, SimilarBrandCandidate[]>> {
  const weeks = await getPublishedLeaderboardWeeks();
  const latest = weeks[0];
  if (!latest || categorySlugs.length === 0) return {};

  const wanted = categorySlugs
    .map((categorySlug) => ({
      slug: categorySlug,
      name: CATEGORY_SLUG_MAP[categorySlug],
    }))
    .filter((entry): entry is { slug: string; name: string } => Boolean(entry.name));
  if (wanted.length === 0) return {};

  const names = wanted.map((entry) => entry.name);
  const overalls = await prisma.snapshot.findMany({
    where: {
      week: latest,
      engine: null,
      category: { in: names },
      rank: { lte: 20 },
    },
    select: {
      category: true,
      rank: true,
      score: true,
      brandId: true,
      brand: { select: { canonicalName: true } },
    },
  });

  type Row = {
    brandId: string;
    brandSlug: string;
    brandName: string;
    rank: number;
    score: number;
  };
  const overallByCategory = new Map<string, Row[]>();
  for (const { name } of wanted) overallByCategory.set(name, []);
  for (const snap of overalls) {
    const list = overallByCategory.get(snap.category);
    if (!list) continue;
    const brandName = getProductDisplayName(snap.brand.canonicalName);
    list.push({
      brandId: snap.brandId,
      brandSlug: toBrandSlug(brandName),
      brandName,
      rank: snap.rank,
      score: snap.score,
    });
  }

  const candidateIds = new Set<string>();
  for (const rows of overallByCategory.values()) {
    const self = rows.find((row) => row.brandSlug === slug);
    if (!self) continue;
    candidateIds.add(self.brandId);
    for (const row of rows) {
      if (Math.abs(row.rank - self.rank) <= 5) candidateIds.add(row.brandId);
    }
  }

  const engineSnaps =
    candidateIds.size === 0
      ? []
      : await prisma.snapshot.findMany({
          where: {
            week: latest,
            engine: { not: null },
            category: { in: names },
            brandId: { in: [...candidateIds] },
          },
          select: {
            category: true,
            engine: true,
            rank: true,
            score: true,
            brand: { select: { canonicalName: true } },
          },
        });

  const byCategory = new Map<string, { overall: SimilarBoard; engines: Record<string, SimilarBoard> }>();
  for (const { name } of wanted) {
    byCategory.set(name, {
      overall: {
        snapshots: (overallByCategory.get(name) ?? []).map((row) => ({
          brandSlug: row.brandSlug,
          brandName: row.brandName,
          rank: row.rank,
          score: row.score,
        })),
      },
      engines: {},
    });
  }

  for (const snap of engineSnaps) {
    const bucket = byCategory.get(snap.category);
    if (!bucket || !snap.engine) continue;
    const brandName = getProductDisplayName(snap.brand.canonicalName);
    bucket.engines[snap.engine] ??= { snapshots: [] };
    bucket.engines[snap.engine].snapshots.push({
      brandSlug: toBrandSlug(brandName),
      brandName,
      rank: snap.rank,
      score: snap.score,
    });
  }

  const result: Record<string, SimilarBrandCandidate[]> = {};
  for (const { slug: categorySlug, name } of wanted) {
    const bucket = byCategory.get(name);
    result[categorySlug] = bucket
      ? selectSimilarBrands(slug, bucket.overall, bucket.engines)
      : [];
  }
  return result;
}

/** Overall Top 20 + engine rows for |Δrank|≤5 neighbors — not the full category dump. */
export const getSimilarBrandsForBrand = cache(
  async (
    slug: string,
    categorySlugs: string[]
  ): Promise<Record<string, SimilarBrandCandidate[]>> => {
    const key = [...categorySlugs].sort().join(",");
    return ttlCache(`similar:${slug}:${key}`, 60_000, () =>
      loadSimilarBrandsForBrand(slug, categorySlugs)
    );
  }
);
