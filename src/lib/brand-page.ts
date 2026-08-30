import { cache } from "react";
import { unstable_cache } from "next/cache";
import {
  buildBrandIndexFromDb,
  buildBrandPages,
  loadBrandPageBundle,
  type BrandPageBundle,
} from "@/lib/brand-page-build";
import { getPublishedLeaderboardWeeks } from "@/lib/published-leaderboard";
import { ttlCache } from "@/lib/ttl-cache";

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
  /**
   * Where `rank` came from. `best_engine` = no overall snapshot this period;
   * rank/score are the best engine-board row (see `bestEngine`).
   */
  rankSource?: "overall" | "best_engine";
  /** Engine key when rankSource is best_engine. */
  bestEngine?: string;
  /** Previous published overall rank in this category; null if absent last period. */
  prevRank?: number | null;
  /** Whether a previous published period exists for this category. */
  hasPrevPeriod?: boolean;
  /** P1: raw AI excerpts per engine (English, unpublished translation). */
  engineExcerpts?: Record<string, string[]>;
}

export interface BrandPageData {
  schemaVersion: number;
  scoringVersion: number;
  week: string;
  slug: string;
  name: string;
  parentCompany: string | null;
  /** Official product site. Omit / null = no 官网 link. */
  website?: string | null;
  updatedAt: string;
  collectedEngines?: string[];
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

// ── DB-first reads (Blob brands/* is optional mirror only) ───────────

/** Prod only. Dev skips `unstable_cache` — `revalidate: false` permanently poisons empty post-backfill reads. */
const CACHE_REVALIDATE = 300;
/** `fetch(..., { next.revalidate })` allows `0` (= always revalidate). */
const FETCH_REVALIDATE_SECONDS = process.env.NODE_ENV === "development" ? 0 : 300;

/**
 * Derive the Blob base from LEADERBOARD_MANIFEST_URL, which points at
 * leaderboards/latest/manifest.json (or a week manifest). Brand data is
 * published next to it under brands/... on the same Blob store.
 * Optional mirror only — not required for primary UX.
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

/** Cached full-week brand pages (DB SoT). Shared by brand + company reads. */
export async function getBrandPagesForWeek(week: string) {
  // Scripts + local dev: always hit DB (backfill then click brand must not see stale empty cache).
  if (!process.env.NEXT_RUNTIME || process.env.NODE_ENV === "development") {
    return buildBrandPages(week);
  }
  return unstable_cache(
    () => buildBrandPages(week),
    ["brand-pages-db", week],
    { revalidate: CACHE_REVALIDATE, tags: [`brand-pages-${week}`] }
  )();
}

async function cachedBrandIndex(week: string) {
  if (!process.env.NEXT_RUNTIME || process.env.NODE_ENV === "development") {
    return buildBrandIndexFromDb(week);
  }
  return unstable_cache(
    () => buildBrandIndexFromDb(week),
    ["brand-index-db", week],
    { revalidate: CACHE_REVALIDATE, tags: [`brand-pages-${week}`] }
  )();
}

async function resolvePublishedWeek(week?: string): Promise<string | null> {
  if (week) return week;
  const weeks = await getPublishedLeaderboardWeeks();
  return weeks[0] ?? null;
}

/**
 * Brand index from DB snapshots for the latest (or given) published week.
 * Blob brands/index.json is not consulted.
 */
export async function getBrandIndex(week?: string): Promise<BrandIndex> {
  const target = await resolvePublishedWeek(week);
  if (!target) return {};
  return cachedBrandIndex(target);
}

export const getBrandPageBundle = cache(
  async (slug: string, requestedWeek?: string): Promise<BrandPageBundle | null> => {
    return ttlCache(`brand-bundle:v2:${slug}:${requestedWeek ?? "latest"}`, 60_000, () =>
      loadBrandPageBundle(slug, requestedWeek)
    );
  }
);

/**
 * Single brand page for a published week — DB SoT (includes engineExcerpts when responses exist).
 * Optional Blob fetch is unused for primary reads.
 */
export const getPublishedBrandPage = cache(
  async (slug: string, week: string): Promise<BrandPageData | null> => {
    const bundle = await getBrandPageBundle(slug, week);
    return bundle?.data ?? null;
  }
);

/**
 * Optional Blob mirror read (debug only). Gated behind `PUBLISH_BLOB_MIRROR=1`.
 * Not used by primary UX paths — brand pages read DB.
 */
export async function getBlobBrandPage(
  slug: string,
  week: string
): Promise<BrandPageData | null> {
  if (process.env.PUBLISH_BLOB_MIRROR !== "1") return null;
  const base = getBlobBaseUrl();
  if (!base) return null;
  try {
    const response = await fetch(
      `${base}/${encodeURIComponent(slug)}/${encodeURIComponent(week)}.json`,
      { next: { revalidate: FETCH_REVALIDATE_SECONDS } }
    );
    if (!response.ok) return null;
    return (await response.json()) as BrandPageData;
  } catch {
    return null;
  }
}
