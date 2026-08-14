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

function matchesSlug(canonicalName: string, slug: string) {
  return toBrandSlug(getProductDisplayName(canonicalName)) === slug;
}

async function lookupBrandBySlug(slug: string): Promise<BrandSlugRef | null> {
  const guesses = [...new Set([slug, slug.replace(/-/g, ""), slug.replace(/-/g, " ")])];
  const hits = await prisma.brand.findMany({
    where: {
      OR: guesses.map((guess) => ({
        canonicalName: { equals: guess, mode: "insensitive" as const },
      })),
    },
    select: { id: true, canonicalName: true, parentBrand: { select: { canonicalName: true } } },
  });
  const direct = hits.find((brand) => matchesSlug(brand.canonicalName, slug));
  if (direct) {
    return {
      id: direct.id,
      canonicalName: direct.canonicalName,
      parentCanonicalName: direct.parentBrand?.canonicalName ?? null,
    };
  }

  const brands = await prisma.brand.findMany({
    select: { id: true, canonicalName: true, parentBrand: { select: { canonicalName: true } } },
  });
  const hit = brands.find((brand) => matchesSlug(brand.canonicalName, slug));
  return hit
    ? {
        id: hit.id,
        canonicalName: hit.canonicalName,
        parentCanonicalName: hit.parentBrand?.canonicalName ?? null,
      }
    : null;
}

/** Request-deduped + 60s per-slug cache. Prefer indexed name lookup over scanning 4k brands. */
export const resolveBrandBySlug = cache(async (slug: string): Promise<BrandSlugRef | null> => {
  return ttlCache(`brand-slug:${slug}`, 60_000, () => lookupBrandBySlug(slug));
});

export const resolveBrandIdBySlug = cache(async (slug: string): Promise<string | null> => {
  const hit = await resolveBrandBySlug(slug);
  return hit?.id ?? null;
});
