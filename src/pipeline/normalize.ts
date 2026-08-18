import { prisma } from "@/lib/db";
import { classifyEntity } from "@/lib/brand-entities";
import {
  PREFERRED_CANONICAL,
  preferredCanonicalName,
} from "@/lib/brand-canonical";
import { normalizeBrandKey, preprocessBrand } from "@/lib/brand-keys";

export { preprocessBrand } from "@/lib/brand-keys";

export async function normalizeWeek(week: string) {
  const mentions = await prisma.extractedMention.findMany({
    where: { response: { week } },
    include: { response: { select: { id: true } } },
  });
  const responseIds = [...new Set(mentions.map((mention) => mention.response.id))];

  const [existingResolved, ignoredTerms, brands, aliases] = await Promise.all([
    prisma.resolvedMention.findMany({
      where: { responseId: { in: responseIds } },
      select: { responseId: true, rawBrand: true },
    }),
    prisma.ignoredTerm.findMany(),
    prisma.brand.findMany(),
    prisma.brandAlias.findMany(),
  ]);

  const resolvedKeys = new Set(
    existingResolved.map((mention) => `${mention.responseId}\u0000${mention.rawBrand}`)
  );
  const ignoredSet = new Set(ignoredTerms.map((term) => normalizeBrandKey(term.term)));
  const canonicalMap = new Map(
    brands.map((brand) => [normalizeBrandKey(brand.canonicalName), brand.id])
  );
  const aliasMap = new Map(
    aliases.map((alias) => [normalizeBrandKey(alias.alias), alias.brandId])
  );
  const reviewCounts = new Map<string, number>();
  const resolvedToCreate: Array<{
    responseId: string;
    brandId: string;
    position: number;
    matchType: string;
    rawBrand: string;
  }> = [];

  for (const mention of mentions) {
    const key = `${mention.response.id}\u0000${mention.rawBrand}`;
    if (resolvedKeys.has(key)) continue;

    const preprocessed = preprocessBrand(mention.rawBrand);
    const preferredKey = normalizeBrandKey(preprocessed);
    const forcedPreferred = Boolean(PREFERRED_CANONICAL[preferredKey]);
    const processed = preferredCanonicalName(preprocessed);
    const lower = normalizeBrandKey(processed);
    if (
      ignoredSet.has(lower) ||
      ignoredSet.has(normalizeBrandKey(mention.rawBrand))
    ) {
      continue;
    }

    // Curated preferred names beat stale review_queue aliases
    // (e.g. "Leonardo" → SAP Leonardo).
    let brandId = canonicalMap.get(lower) ?? null;
    let matchType: string | null = brandId
      ? forcedPreferred
        ? "preferred"
        : "canonical"
      : null;

    if (!brandId && !forcedPreferred) {
      brandId =
        aliasMap.get(lower) ??
        aliasMap.get(preferredKey) ??
        aliasMap.get(normalizeBrandKey(mention.rawBrand)) ??
        null;
      if (brandId) matchType = "alias";
    }

    if (!brandId) {
      // Avoid hard-failing on brand canonicalName uniqueness.
      // We may "not see" an existing brand in the precomputed maps due to
      // key normalization mismatches, but the DB constraint is still the source
      // of truth.
      const existing = await prisma.brand.findUnique({
        where: { canonicalName: processed },
      });
      if (existing) {
        brandId = existing.id;
        matchType = "canonical_existing";
        canonicalMap.set(lower, brandId);
      } else {
        const rule = classifyEntity(processed);
        const newBrand = await prisma.brand.create({
          data: {
            canonicalName: processed,
            entityType: rule.type,
            rankingEnabled: rule.rankingEnabled,
          },
        });
        brandId = newBrand.id;
        matchType = "auto_new";
        canonicalMap.set(lower, brandId);
        reviewCounts.set(processed, (reviewCounts.get(processed) ?? 0) + 1);
      }
    }

    resolvedToCreate.push({
      responseId: mention.response.id,
      brandId,
      position: mention.position,
      matchType: matchType!,
      rawBrand: mention.rawBrand,
    });
    resolvedKeys.add(key);
  }

  if (resolvedToCreate.length > 0) {
    await prisma.resolvedMention.createMany({
      data: resolvedToCreate,
      skipDuplicates: true,
    });
  }

  if (reviewCounts.size > 0) {
    const existingReviews = await prisma.brandReviewQueue.findMany({
      where: { week, rawBrand: { in: [...reviewCounts.keys()] } },
      select: { id: true, rawBrand: true, count: true },
    });
    const existingReviewMap = new Map(
      existingReviews.map((review) => [review.rawBrand, review])
    );

    for (const [rawBrand, count] of reviewCounts) {
      const existing = existingReviewMap.get(rawBrand);
      if (existing) {
        await prisma.brandReviewQueue.update({
          where: { id: existing.id },
          data: { count: existing.count + count },
        });
      } else {
        await prisma.brandReviewQueue.create({
          data: { rawBrand, count, week, status: "pending" },
        });
      }
    }
  }

  return resolvedToCreate.length;
}
