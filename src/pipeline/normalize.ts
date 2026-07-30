import { prisma } from "@/lib/db";
import { classifyEntity } from "@/lib/brand-entities";

import { normalizeBrandKey, preprocessBrand } from "@/lib/brand-keys";

export { preprocessBrand } from "@/lib/brand-keys";

export async function normalizeWeek(week: string) {
  const mentions = await prisma.extractedMention.findMany({
    where: { response: { week } },
    include: { response: true },
  });

  const ignoredTerms = await prisma.ignoredTerm.findMany();
  const ignoredSet = new Set(ignoredTerms.map((t) => normalizeBrandKey(t.term)));

  const brands = await prisma.brand.findMany();
  const aliases = await prisma.brandAlias.findMany();

  const canonicalMap = new Map(
    brands.map((b) => [normalizeBrandKey(b.canonicalName), b.id])
  );
  const aliasMap = new Map(
    aliases.map((a) => [normalizeBrandKey(a.alias), a.brandId])
  );

  const reviewCounts = new Map<string, number>();
  let resolved = 0;

  for (const mention of mentions) {
    const existing = await prisma.resolvedMention.findFirst({
      where: { responseId: mention.responseId, rawBrand: mention.rawBrand },
    });
    if (existing) continue;

    const processed = preprocessBrand(mention.rawBrand);
    const lower = normalizeBrandKey(processed);

    if (
      ignoredSet.has(lower) ||
      ignoredSet.has(normalizeBrandKey(mention.rawBrand))
    ) {
      continue;
    }

    let brandId = canonicalMap.get(lower) ?? aliasMap.get(lower);
    let matchType = brandId
      ? canonicalMap.has(lower)
        ? "canonical"
        : "alias"
      : null;

    if (!brandId) {
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

      reviewCounts.set(
        processed,
        (reviewCounts.get(processed) ?? 0) + 1
      );
    }

    await prisma.resolvedMention.create({
      data: {
        responseId: mention.responseId,
        brandId,
        position: mention.position,
        matchType: matchType!,
        rawBrand: mention.rawBrand,
      },
    });
    resolved++;
  }

  for (const [rawBrand, count] of reviewCounts) {
    const existing = await prisma.brandReviewQueue.findFirst({
      where: { rawBrand, week },
    });
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

  return resolved;
}
