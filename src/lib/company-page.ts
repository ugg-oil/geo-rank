import { cache } from "react";
import { prisma } from "@/lib/db";
import { CATEGORY_TO_SLUG } from "@/lib/categories";
import { toBrandSlug } from "@/lib/brand-slug";
import type { BrandPageData } from "@/lib/brand-page";
import {
  buildCompanyPagesFromBrandPages,
  mergeCompanyIndex,
} from "@/lib/company-data";
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
}

export interface CompanyProductEntry {
  slug: string;
  name: string;
  categories: CompanyProductCategoryEntry[];
}

export interface CompanyPageData {
  schemaVersion: number;
  scoringVersion: number;
  week: string;
  slug: string;
  name: string;
  updatedAt: string;
  products: CompanyProductEntry[];
}

export interface CompanyIndexEntry {
  name: string;
}

export type CompanyIndex = Record<string, CompanyIndexEntry>;

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

  return [...bySlug.values()];
}

async function loadCompanyPagesBySlug(week: string): Promise<Map<string, CompanyPageData>> {
  const brandPages = await loadOverallBrandPages(week);
  const { companyPages } = buildCompanyPagesFromBrandPages(brandPages, {
    week,
    scoringVersion: SCORING_VERSION,
  });
  return new Map(companyPages.map((page) => [page.slug, page]));
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
 * once and reused across company slugs.
 */
export async function getPublishedCompanyPage(
  slug: string,
  week: string
): Promise<CompanyPageData | null> {
  const pages = await ttlCache(`company-pages:${week}`, 60_000, () =>
    loadCompanyPagesBySlug(week)
  );
  return pages.get(slug) ?? null;
}

export async function getFallbackCompanyPage(
  slug: string,
  week?: string
): Promise<CompanyPageData | null> {
  const weeks = week ? [week] : await getPublishedLeaderboardWeeks();
  const targetWeek = weeks[0];
  if (!targetWeek) return null;
  return getPublishedCompanyPage(slug, targetWeek);
}

export const getCompanyPage = cache(async (slug: string): Promise<CompanyPageData | null> => {
  const weeks = await getPublishedLeaderboardWeeks();
  const latest = weeks[0];
  if (!latest) return null;
  return getPublishedCompanyPage(slug, latest);
});
