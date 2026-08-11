import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import {
  getBrandIndex,
  getBrandPagesForWeek,
  getPublishedBrandPage,
  type BrandPageData,
} from "@/lib/brand-page";
import { toBrandSlug } from "@/lib/brand-slug";
import {
  buildCompanyPagesFromBrandPages,
  mergeCompanyIndex,
} from "@/lib/company-data";
import { SCORING_VERSION } from "@/lib/constants";
import { getPublishedLeaderboardWeeks } from "@/lib/published-leaderboard";

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

const REVALIDATE_SECONDS = process.env.NODE_ENV === "development" ? 0 : 300;

async function buildCompanyIndexFromDb(week: string): Promise<CompanyIndex> {
  const { brandPages } = await getBrandPagesForWeek(week);
  const { companyIndex: fromProducts } = buildCompanyPagesFromBrandPages(brandPages, {
    week,
    scoringVersion: SCORING_VERSION,
  });

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
  ];

  return mergeCompanyIndex(fromProducts, extras);
}

/**
 * Company index from DB (brand snapshots + company entities). Blob not required.
 */
export async function getCompanyIndex(): Promise<CompanyIndex> {
  const weeks = await getPublishedLeaderboardWeeks();
  const week = weeks[0];
  if (!week) return {};

  if (!process.env.NEXT_RUNTIME) {
    return buildCompanyIndexFromDb(week);
  }
  return unstable_cache(
    () => buildCompanyIndexFromDb(week),
    ["company-index-db", week],
    { revalidate: REVALIDATE_SECONDS, tags: [`brand-pages-${week}`] }
  )();
}

/**
 * Company page for a published week — DB SoT via brand pages.
 */
export async function getPublishedCompanyPage(
  slug: string,
  week: string
): Promise<CompanyPageData | null> {
  const { brandPages } = await getBrandPagesForWeek(week);
  const { companyPages } = buildCompanyPagesFromBrandPages(brandPages, {
    week,
    scoringVersion: SCORING_VERSION,
  });
  return companyPages.find((page) => page.slug === slug) ?? null;
}

/**
 * Derive a company page from DB brand pages when no direct company snapshot.
 */
export async function getFallbackCompanyPage(
  slug: string,
  week?: string
): Promise<CompanyPageData | null> {
  const weeks = week ? [week] : await getPublishedLeaderboardWeeks();
  const targetWeek = weeks[0];
  if (!targetWeek) return null;

  const published = await getPublishedCompanyPage(slug, targetWeek);
  if (published) return published;

  // Narrow path: children via brand index when full week build missed the company.
  const brandIndex = await getBrandIndex(targetWeek);
  const childSlugs = Object.entries(brandIndex)
    .filter(([, entry]) => entry.parentCompany && toBrandSlug(entry.parentCompany) === slug)
    .map(([brandSlug]) => brandSlug);

  if (childSlugs.length === 0) return null;

  const brandPages = (
    await Promise.all(childSlugs.map((brandSlug) => getPublishedBrandPage(brandSlug, targetWeek)))
  ).filter((page): page is BrandPageData => page != null);

  if (brandPages.length === 0) return null;

  const { companyPages } = buildCompanyPagesFromBrandPages(brandPages, {
    week: targetWeek,
    scoringVersion: SCORING_VERSION,
  });
  return companyPages.find((page) => page.slug === slug) ?? null;
}

export async function getCompanyPage(slug: string): Promise<CompanyPageData | null> {
  const weeks = await getPublishedLeaderboardWeeks();
  const latest = weeks[0];
  if (latest) {
    const published = await getPublishedCompanyPage(slug, latest);
    if (published) return published;
  }
  return getFallbackCompanyPage(slug, latest);
}
