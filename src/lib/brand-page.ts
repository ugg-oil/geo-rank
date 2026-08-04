// ── Types (matching PRD data contract) ──────────────────────────────

export interface BrandPageEngineEntry {
  rank: number;
  score: number;
}

export interface BrandPageCategoryEntry {
  slug: string;
  rank: number;
  score: number;
  mentionFrequency: number;
  engines: Record<string, BrandPageEngineEntry>;
}

export interface BrandPageData {
  schemaVersion: number;
  scoringVersion: number;
  week: string;
  slug: string;
  name: string;
  parentCompany: string | null;
  updatedAt: string;
  categories: BrandPageCategoryEntry[];
}

export interface BrandIndexEntry {
  name: string;
  parentCompany: string | null;
}

export type BrandIndex = Record<string, BrandIndexEntry>;

// ── Slug helpers ────────────────────────────────────────────────────

/** Deterministic URL-safe slug from a brand's canonical display name. */
export function toBrandSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ── Read from Vercel Blob ───────────────────────────────────────────

const PUBLISHED_REVALIDATE_SECONDS =
  process.env.NODE_ENV === "development" ? 0 : 300;

/**
 * Derive the Blob base from LEADERBOARD_MANIFEST_URL, which points at
 * leaderboards/latest/manifest.json (or a week manifest). Brand data is
 * published next to it under brands/... on the same Blob store.
 */
function getBlobBaseUrl(): string | null {
  const manifestUrl = process.env.LEADERBOARD_MANIFEST_URL;
  if (!manifestUrl) return null;
  try {
    const url = new URL(manifestUrl);
    const path = url.pathname.replace(/\/leaderboards\/(latest\/)?manifest\.json$/, "");
    url.pathname = `${path}/brands`;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/**
 * Read the brands index from Blob (published during pipeline runs).
 * Returns a map of slug → { name, parentCompany }.
 */
export async function getBrandIndex(): Promise<BrandIndex> {
  const base = getBlobBaseUrl();
  if (!base) return {};
  try {
    const response = await fetch(`${base}/index.json`, {
      next: { revalidate: PUBLISHED_REVALIDATE_SECONDS },
    });
    if (!response.ok) return {};
    return (await response.json()) as BrandIndex;
  } catch {
    return {};
  }
}

/**
 * Read a single brand's data for a given week from Blob.
 */
export async function getPublishedBrandPage(
  slug: string,
  week: string
): Promise<BrandPageData | null> {
  const base = getBlobBaseUrl();
  if (!base) return null;
  try {
    const response = await fetch(
      `${base}/${encodeURIComponent(slug)}/${encodeURIComponent(week)}.json`,
      { next: { revalidate: PUBLISHED_REVALIDATE_SECONDS } }
    );
    if (!response.ok) return null;
    return (await response.json()) as BrandPageData;
  } catch {
    return null;
  }
}
