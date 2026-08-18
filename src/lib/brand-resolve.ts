import { cache } from "react";
import { toBrandSlug } from "@/lib/brand-slug";
import { prisma } from "@/lib/db";
import { getProductDisplayName } from "@/lib/parent-company";
import { ttlCache } from "@/lib/ttl-cache";

export type BrandSlugRef = {
  id: string;
  canonicalName: string;
  parentCanonicalName: string | null;
};

type BrandCandidate = {
  id: string;
  canonicalName: string;
  parentBrand: { canonicalName: string } | null;
};

function matchesSlug(canonicalName: string, slug: string) {
  return toBrandSlug(getProductDisplayName(canonicalName)) === slug;
}

function toRef(brand: BrandCandidate): BrandSlugRef {
  return {
    id: brand.id,
    canonicalName: brand.canonicalName,
    parentCanonicalName: brand.parentBrand?.canonicalName ?? null,
  };
}

/**
 * When multiple brands share a slug (DALL·E vs DALL-E), prefer the one that
 * actually has published snapshots — otherwise board links 404 onto ghosts.
 *
 * Do not short-circuit on a single `canonicalName equals` hit: "dall-e" equals
 * "DALL-E" case-insensitively and would skip the live "DALL·E" row.
 */
async function pickBestSlugMatch(candidates: BrandCandidate[]): Promise<BrandSlugRef | null> {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return toRef(candidates[0]!);

  const ids = candidates.map((c) => c.id);
  const withOverall = await prisma.snapshot.groupBy({
    by: ["brandId"],
    where: { brandId: { in: ids }, engine: null },
    _count: { id: true },
  });
  const overallSet = new Set(withOverall.map((row) => row.brandId));
  const overallHit = candidates.find((c) => overallSet.has(c.id));
  if (overallHit) return toRef(overallHit);

  const withAny = await prisma.snapshot.groupBy({
    by: ["brandId"],
    where: { brandId: { in: ids } },
    _count: { id: true },
  });
  const anySet = new Set(withAny.map((row) => row.brandId));
  const anyHit = candidates.find((c) => anySet.has(c.id));
  if (anyHit) return toRef(anyHit);

  return toRef(candidates[0]!);
}

async function lookupBrandBySlug(slug: string): Promise<BrandSlugRef | null> {
  const brands = await prisma.brand.findMany({
    select: { id: true, canonicalName: true, parentBrand: { select: { canonicalName: true } } },
  });
  return pickBestSlugMatch(brands.filter((brand) => matchesSlug(brand.canonicalName, slug)));
}

/** Request-deduped + 60s per-slug cache. */
export const resolveBrandBySlug = cache(async (slug: string): Promise<BrandSlugRef | null> => {
  // v3: always slug-scan; never trust a single equals hit under collisions.
  return ttlCache(`brand-slug:v3:${slug}`, 60_000, () => lookupBrandBySlug(slug));
});

export const resolveBrandIdBySlug = cache(async (slug: string): Promise<string | null> => {
  const hit = await resolveBrandBySlug(slug);
  return hit?.id ?? null;
});
