import {
  getBrandIndex,
  getPublishedBrandPage,
  type BrandPageData,
} from "@/lib/brand-page";
import { toBrandSlug } from "@/lib/brand-slug";
import { buildCompanyPagesFromBrandPages } from "@/lib/company-data";
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

const PUBLISHED_REVALIDATE_SECONDS =
  process.env.NODE_ENV === "development" ? 0 : 300;

function getCompaniesBlobBaseUrl(): string | null {
  const manifestUrl = process.env.LEADERBOARD_MANIFEST_URL;
  if (!manifestUrl) return null;
  try {
    const url = new URL(manifestUrl);
    const path = url.pathname.replace(/\/leaderboards\/(latest\/)?manifest\.json$/, "");
    url.pathname = `${path}/companies`;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export async function getCompanyIndex(): Promise<CompanyIndex> {
  const base = getCompaniesBlobBaseUrl();
  if (!base) return {};
  try {
    const response = await fetch(`${base}/index.json`, {
      next: { revalidate: PUBLISHED_REVALIDATE_SECONDS },
    });
    if (!response.ok) return {};
    return (await response.json()) as CompanyIndex;
  } catch {
    return {};
  }
}

export async function getPublishedCompanyPage(
  slug: string,
  week: string
): Promise<CompanyPageData | null> {
  const base = getCompaniesBlobBaseUrl();
  if (!base) return null;
  try {
    const response = await fetch(
      `${base}/${encodeURIComponent(slug)}/${encodeURIComponent(week)}.json`,
      { next: { revalidate: PUBLISHED_REVALIDATE_SECONDS } }
    );
    if (!response.ok) return null;
    return (await response.json()) as CompanyPageData;
  } catch {
    return null;
  }
}

/**
 * Derive a company page from published brand pages when companies Blob is missing.
 */
export async function getFallbackCompanyPage(
  slug: string,
  week?: string
): Promise<CompanyPageData | null> {
  const weeks = week ? [week] : await getPublishedLeaderboardWeeks();
  const targetWeek = weeks[0];
  if (!targetWeek) return null;

  const brandIndex = await getBrandIndex();
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
