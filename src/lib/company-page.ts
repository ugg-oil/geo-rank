import { cache } from "react";
import { prisma } from "@/lib/db";
import { CATEGORY_TO_SLUG } from "@/lib/categories";
import { toBrandSlug } from "@/lib/brand-slug";
import type { BrandPageData } from "@/lib/brand-page";
import {
  buildCompanyPagesFromBrandPages,
  mergeCompanyIndex,
} from "@/lib/company-data";
import {
  buildCompanySummary,
  buildPrevRankLookup,
  enrichProductsWithPreviousRanks,
  type CompanySummary,
} from "@/lib/company-page-view";
import { SCORING_VERSION } from "@/lib/constants";
import {
  getCompanyColumnName,
  getProductDisplayName,
  listCuratedOwnerNames,
} from "@/lib/parent-company";
import { getPublishedLeaderboardWeeks } from "@/lib/published-leaderboard";
import { ttlCache } from "@/lib/ttl-cache";

export interface CompanyProductCategoryEntry {
  slug: string;
  rank: number;
  score: number;
  mentionFrequency: number;
  /** Present only when previous published week had this product×category. */
  previousRank?: number;
}

export interface CompanyProductEntry {
  slug: string;
  name: string;
  categories: CompanyProductCategoryEntry[];
}

/** Most recent published period where the company still had overall-board products. */
export interface CompanyLastSeen {
  week: string;
  products: CompanyProductEntry[];
}

export interface CompanyPageData {
  schemaVersion: number;
  scoringVersion: number;
  week: string;
  slug: string;
  name: string;
  updatedAt: string;
  products: CompanyProductEntry[];
  hasPrevWeekData: boolean;
  /** null when products.length === 0 */
  summary: CompanySummary | null;
  /** Only set for the empty state, so "no products" can say when that changed. */
  lastSeen: CompanyLastSeen | null;
}

export interface CompanyIndexEntry {
  name: string;
}

export type CompanyIndex = Record<string, CompanyIndexEntry>;

export type { CompanySummary };

async function loadOverallBrandPages(week: string): Promise<BrandPageData[]> {
  const snaps = await prisma.snapshot.findMany({
    where: { week, engine: null },
    select: {
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

  const updatedAt = new Date().toISOString().split("T")[0]!;
  const bySlug = new Map<string, BrandPageData>();

  for (const snap of snaps) {
    const categorySlug = CATEGORY_TO_SLUG[snap.category];
    if (!categorySlug) continue;
    const displayName = getProductDisplayName(snap.brand.canonicalName);
    const slug = toBrandSlug(displayName);
    if (!slug) continue;

    let page = bySlug.get(slug);
    if (!page) {
      page = {
        schemaVersion: 1,
        scoringVersion: SCORING_VERSION,
        week,
        slug,
        name: displayName,
        parentCompany: getCompanyColumnName(
          snap.brand.canonicalName,
          snap.brand.parentBrand?.canonicalName
        ),
        updatedAt,
        categories: [],
      };
      bySlug.set(slug, page);
    }

    page.categories.push({
      slug: categorySlug,
      rank: snap.rank,
      score: snap.score,
      mentionFrequency: snap.appearanceRate,
      engines: {},
    });
  }

  // Same display slug can absorb multiple brand rows (e.g. iCloud vs iCloud+
  // before slug rules diverge). Keep one entry per category — best rank.
  for (const page of bySlug.values()) {
    const best = new Map<string, (typeof page.categories)[number]>();
    for (const entry of page.categories) {
      const prev = best.get(entry.slug);
      if (!prev || entry.rank < prev.rank) best.set(entry.slug, entry);
    }
    page.categories = [...best.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  }

  return [...bySlug.values()];
}

type RawCompanyPage = Omit<CompanyPageData, "hasPrevWeekData" | "summary" | "lastSeen">;

async function loadCompanyPagesBySlug(week: string): Promise<Map<string, RawCompanyPage>> {
  const brandPages = await loadOverallBrandPages(week);
  const { companyPages } = buildCompanyPagesFromBrandPages(brandPages, {
    week,
    scoringVersion: SCORING_VERSION,
  });
  return new Map(companyPages.map((page) => [page.slug, page]));
}

function finalizeCompanyPage(
  page: RawCompanyPage,
  prevPage: RawCompanyPage | null
): CompanyPageData {
  const hasPrevWeekData = Boolean(prevPage);
  const prevLookup = prevPage ? buildPrevRankLookup(prevPage.products) : null;
  const products = enrichProductsWithPreviousRanks(page.products, prevLookup);
  return {
    ...page,
    products,
    hasPrevWeekData,
    summary: buildCompanySummary(products, hasPrevWeekData),
    lastSeen: null,
  };
}

async function buildCompanyIndexFromDb(): Promise<CompanyIndex> {
  const [companyEntities, parentBrands] = await Promise.all([
    prisma.brand.findMany({
      where: { entityType: "company" },
      select: { canonicalName: true },
    }),
    prisma.brand.findMany({
      where: { parentBrandId: { not: null } },
      select: { parentBrand: { select: { canonicalName: true } } },
    }),
  ]);

  const extras = [
    ...companyEntities.map((row) => ({ name: row.canonicalName })),
    ...parentBrands
      .map((row) => row.parentBrand?.canonicalName)
      .filter((name): name is string => Boolean(name))
      .map((name) => ({ name })),
    ...listCuratedOwnerNames().map((name) => ({ name })),
  ];

  return mergeCompanyIndex({}, extras);
}

export const getCompanyIndex = cache(async (): Promise<CompanyIndex> => {
  return ttlCache("company-index", 60_000, buildCompanyIndexFromDb);
});

/**
 * Company page for a published week. Overall snapshots for the week are cached
 * once and reused across company slugs. Attaches previous-week ranks when a
 * prior published week exists.
 */
export async function getPublishedCompanyPage(
  slug: string,
  week: string,
  previousWeek?: string | null
): Promise<CompanyPageData | null> {
  const pages = await ttlCache(`company-pages:${week}`, 60_000, () =>
    loadCompanyPagesBySlug(week)
  );
  const page = pages.get(slug);
  if (!page) return null;

  let prevPage: RawCompanyPage | null = null;
  if (previousWeek) {
    const prevPages = await ttlCache(`company-pages:${previousWeek}`, 60_000, () =>
      loadCompanyPagesBySlug(previousWeek)
    );
    prevPage = prevPages.get(slug) ?? null;
  }

  return finalizeCompanyPage(page, prevPage);
}

export async function getFallbackCompanyPage(
  slug: string,
  week?: string
): Promise<CompanyPageData | null> {
  const weeks = await getPublishedLeaderboardWeeks();
  const targetWeek = week ?? weeks[0];
  if (!targetWeek) return null;
  const weekIndex = weeks.indexOf(targetWeek);
  const previousWeek = weekIndex >= 0 ? (weeks[weekIndex + 1] ?? null) : null;
  return getPublishedCompanyPage(slug, targetWeek, previousWeek);
}

export const getCompanyPage = cache(async (slug: string): Promise<CompanyPageData | null> => {
  const weeks = await getPublishedLeaderboardWeeks();
  const latest = weeks[0];
  if (!latest) return null;
  return getPublishedCompanyPage(slug, latest, weeks[1] ?? null);
});

/**
 * Latest published period before `week` that still had overall-board products
 * for this company. Lookback is bounded because each period scans that period's
 * overall snapshots (cached per period, shared across company slugs).
 */
export async function getCompanyLastSeen(
  slug: string,
  maxLookback = 4
): Promise<CompanyLastSeen | null> {
  const weeks = await getPublishedLeaderboardWeeks();
  for (const week of weeks.slice(1, 1 + maxLookback)) {
    const pages = await ttlCache(`company-pages:${week}`, 60_000, () =>
      loadCompanyPagesBySlug(week)
    );
    const page = pages.get(slug);
    if (page && page.products.length > 0) {
      return { week, products: page.products };
    }
  }
  return null;
}

/** Empty shell for indexed companies with no ranked products this period. */
export function emptyCompanyPageData(
  slug: string,
  name: string,
  week: string,
  lastSeen: CompanyLastSeen | null = null
): CompanyPageData {
  return {
    schemaVersion: 1,
    scoringVersion: SCORING_VERSION,
    week,
    slug,
    name,
    updatedAt: new Date().toISOString().split("T")[0]!,
    products: [],
    hasPrevWeekData: false,
    summary: null,
    lastSeen,
  };
}
