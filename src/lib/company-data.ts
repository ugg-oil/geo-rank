import type { BrandPageCategoryEntry, BrandPageData } from "@/lib/brand-page";
import { toBrandSlug } from "@/lib/brand-slug";
import { SCORING_VERSION } from "@/lib/constants";
import type {
  CompanyIndex,
  CompanyPageData,
  CompanyProductCategoryEntry,
  CompanyProductEntry,
} from "@/lib/company-page";

function toCompanyProductCategory(
  entry: BrandPageCategoryEntry
): CompanyProductCategoryEntry {
  return {
    slug: entry.slug,
    rank: entry.rank,
    score: entry.score,
    mentionFrequency: entry.mentionFrequency,
  };
}

/**
 * Aggregate brand pages into company pages by parentCompany display name.
 * Skips brands with no parent. No company totals/ranks.
 */
export function buildCompanyPagesFromBrandPages(
  brandPages: BrandPageData[],
  options: { week?: string; updatedAt?: string; scoringVersion?: number } = {}
): { companyPages: CompanyPageData[]; companyIndex: CompanyIndex } {
  const byCompany = new Map<
    string,
    { name: string; products: Map<string, CompanyProductEntry> }
  >();

  for (const brand of brandPages) {
    if (!brand.parentCompany) continue;
    const companySlug = toBrandSlug(brand.parentCompany);
    if (!companySlug) continue;

    let company = byCompany.get(companySlug);
    if (!company) {
      company = { name: brand.parentCompany, products: new Map() };
      byCompany.set(companySlug, company);
    }

    const categories = [...brand.categories]
      .map(toCompanyProductCategory)
      .sort((a, b) => a.slug.localeCompare(b.slug));

    company.products.set(brand.slug, {
      slug: brand.slug,
      name: brand.name,
      categories,
    });
  }

  const week =
    options.week ??
    brandPages.find((page) => page.week)?.week ??
    "";
  const updatedAt =
    options.updatedAt ?? new Date().toISOString().split("T")[0]!;
  const scoringVersion = options.scoringVersion ?? SCORING_VERSION;

  const companyPages: CompanyPageData[] = [...byCompany.entries()]
    .map(([slug, info]) => ({
      schemaVersion: 1,
      scoringVersion,
      week,
      slug,
      name: info.name,
      updatedAt,
      products: [...info.products.values()].sort((a, b) =>
        a.slug.localeCompare(b.slug)
      ),
      hasPrevWeekData: false,
      summary: null,
      lastSeen: null,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  const companyIndex: CompanyIndex = Object.fromEntries(
    companyPages.map((page) => [page.slug, { name: page.name }])
  );

  return { companyPages, companyIndex };
}

/** Merge extra company names (e.g. DB entityType=company) into the index. */
export function mergeCompanyIndex(
  base: CompanyIndex,
  extras: { name: string; slug?: string }[]
): CompanyIndex {
  const next: CompanyIndex = { ...base };
  for (const entry of extras) {
    const slug = entry.slug ?? toBrandSlug(entry.name);
    if (!slug) continue;
    if (!next[slug]) next[slug] = { name: entry.name };
  }
  return next;
}
