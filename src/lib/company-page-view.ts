import type {
  CompanyProductCategoryEntry,
  CompanyProductEntry,
} from "@/lib/company-page";
import { getRankDelta, type RankDelta } from "@/lib/rank-change";

export type CompanyProductSortKey = "rank" | "score" | "category";

export type CompanySummaryBestProduct = {
  slug: string;
  name: string;
  rank: number;
  categorySlug: string;
};

export type CompanySummaryBiggestRiser = {
  slug: string;
  name: string;
  spots: number;
  categorySlug: string;
  rank: number;
};

export type CompanySummary = {
  productCount: number;
  categoryCount: number;
  bestProduct: CompanySummaryBestProduct;
  biggestRiser?: CompanySummaryBiggestRiser;
};

/** Best-rank category; ties break by slug ascending. */
export function primaryCategory(
  product: CompanyProductEntry
): CompanyProductCategoryEntry | null {
  if (product.categories.length === 0) return null;
  return product.categories.reduce((best, entry) => {
    if (entry.rank < best.rank) return entry;
    if (entry.rank === best.rank && entry.slug < best.slug) return entry;
    return best;
  });
}

function bestRank(product: CompanyProductEntry): number {
  return Math.min(...product.categories.map((c) => c.rank));
}

function bestScore(product: CompanyProductEntry): number {
  return Math.max(...product.categories.map((c) => c.score));
}

function compareByName(a: CompanyProductEntry, b: CompanyProductEntry): number {
  return a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug);
}

/**
 * Sort products. pinSlug (from=/brand/{slug}) floats that product first;
 * remaining order follows sortKey. Empty-category products sort last.
 */
export function sortCompanyProducts(
  products: CompanyProductEntry[],
  sortKey: CompanyProductSortKey,
  categoryNameOf: (slug: string) => string,
  pinSlug?: string | null
): CompanyProductEntry[] {
  const ranked = [...products].sort((a, b) => {
    const aEmpty = a.categories.length === 0;
    const bEmpty = b.categories.length === 0;
    if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;

    if (sortKey === "score") {
      const scoreDiff = bestScore(b) - bestScore(a);
      if (scoreDiff !== 0) return scoreDiff;
      return compareByName(a, b);
    }

    if (sortKey === "category") {
      const aCat = primaryCategory(a);
      const bCat = primaryCategory(b);
      const aName = aCat ? categoryNameOf(aCat.slug) : "";
      const bName = bCat ? categoryNameOf(bCat.slug) : "";
      const nameDiff = aName.localeCompare(bName);
      if (nameDiff !== 0) return nameDiff;
      return compareByName(a, b);
    }

    // rank (default)
    const rankDiff = bestRank(a) - bestRank(b);
    if (rankDiff !== 0) return rankDiff;
    return compareByName(a, b);
  });

  if (!pinSlug) return ranked;
  const pinnedIdx = ranked.findIndex((p) => p.slug === pinSlug);
  if (pinnedIdx <= 0) return ranked;
  const [pinned] = ranked.splice(pinnedIdx, 1);
  return [pinned!, ...ranked];
}

export function categoryRankDelta(
  entry: CompanyProductCategoryEntry,
  productSlug: string,
  hasPrevWeekData: boolean
): RankDelta {
  const prevRanks: Record<string, number> = {};
  if (entry.previousRank !== undefined) {
    prevRanks[productSlug] = entry.previousRank;
  }
  return getRankDelta(entry.rank, prevRanks, productSlug, hasPrevWeekData);
}

export function buildCompanySummary(
  products: CompanyProductEntry[],
  hasPrevWeekData: boolean
): CompanySummary | null {
  if (products.length === 0) return null;

  const categorySlugs = new Set<string>();
  let bestProduct: CompanySummaryBestProduct | null = null;
  let biggestRiser: CompanySummaryBiggestRiser | undefined;

  for (const product of products) {
    for (const cat of product.categories) {
      categorySlugs.add(cat.slug);

      if (
        !bestProduct ||
        cat.rank < bestProduct.rank ||
        (cat.rank === bestProduct.rank && product.name.localeCompare(bestProduct.name) < 0)
      ) {
        bestProduct = {
          slug: product.slug,
          name: product.name,
          rank: cat.rank,
          categorySlug: cat.slug,
        };
      }

      if (!hasPrevWeekData) continue;
      const delta = categoryRankDelta(cat, product.slug, true);
      if (delta.kind !== "up") continue;
      if (
        !biggestRiser ||
        delta.spots > biggestRiser.spots ||
        (delta.spots === biggestRiser.spots && cat.rank < biggestRiser.rank) ||
        (delta.spots === biggestRiser.spots &&
          cat.rank === biggestRiser.rank &&
          product.name.localeCompare(biggestRiser.name) < 0)
      ) {
        biggestRiser = {
          slug: product.slug,
          name: product.name,
          spots: delta.spots,
          categorySlug: cat.slug,
          rank: cat.rank,
        };
      }
    }
  }

  if (!bestProduct) return null;

  return {
    productCount: products.length,
    categoryCount: categorySlugs.size,
    bestProduct,
    biggestRiser,
  };
}

/** Attach previousRank from a prior-week product×category map. */
export function enrichProductsWithPreviousRanks(
  products: CompanyProductEntry[],
  prevByProduct: Map<string, Map<string, number>> | null
): CompanyProductEntry[] {
  if (!prevByProduct) {
    return products.map((product) => ({
      ...product,
      categories: product.categories.map(({ slug, rank, score, mentionFrequency }) => ({
        slug,
        rank,
        score,
        mentionFrequency,
      })),
    }));
  }

  return products.map((product) => {
    const prevCats = prevByProduct.get(product.slug);
    return {
      ...product,
      categories: product.categories.map((cat) => {
        const previousRank = prevCats?.get(cat.slug);
        return {
          slug: cat.slug,
          rank: cat.rank,
          score: cat.score,
          mentionFrequency: cat.mentionFrequency,
          ...(previousRank !== undefined ? { previousRank } : {}),
        };
      }),
    };
  });
}

export function buildPrevRankLookup(
  products: CompanyProductEntry[]
): Map<string, Map<string, number>> {
  const map = new Map<string, Map<string, number>>();
  for (const product of products) {
    const cats = new Map<string, number>();
    for (const cat of product.categories) {
      cats.set(cat.slug, cat.rank);
    }
    map.set(product.slug, cats);
  }
  return map;
}
