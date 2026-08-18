import { prisma } from "@/lib/db";
import {
  normalizeBrandKey,
  preferredCanonicalName,
  PREFERRED_CANONICAL,
} from "@/lib/brand-canonical";

export async function consolidateBrands() {
  const brands = await prisma.brand.findMany();
  const nameToBrand = new Map(
    brands.map((b) => [normalizeBrandKey(b.canonicalName), b])
  );

  const brandIdToTarget = new Map<string, string>();

  function resolveTargetId(canonicalName: string): string | null {
    const preferred = preferredCanonicalName(canonicalName);
    const target =
      brands.find((b) => b.canonicalName === preferred) ??
      nameToBrand.get(normalizeBrandKey(preferred));
    return target?.id ?? null;
  }

  for (const brand of brands) {
    const targetId = resolveTargetId(brand.canonicalName) ?? brand.id;
    brandIdToTarget.set(brand.id, targetId);
  }

  // Aliases resolve raw mention strings at normalize time. Do NOT use them to
  // merge Brand rows — review_queue aliases like "Leonardo"→SAP Leonardo or
  // "DALL·E"→OpenAI DALL·E otherwise collapse unrelated products.

  for (const [variant] of Object.entries(PREFERRED_CANONICAL)) {
    const preferred = PREFERRED_CANONICAL[variant];
    const target = brands.find((b) => b.canonicalName === preferred);
    if (!target) continue;
    const variantBrand = nameToBrand.get(variant);
    if (variantBrand && variantBrand.id !== target.id) {
      brandIdToTarget.set(variantBrand.id, target.id);
    }
  }

  let updatedMentions = 0;
  const byTarget = new Map<string, string[]>();
  for (const [fromId, toId] of brandIdToTarget) {
    if (fromId === toId) continue;
    if (!byTarget.has(toId)) byTarget.set(toId, []);
    byTarget.get(toId)!.push(fromId);
  }

  for (const [toId, fromIds] of byTarget) {
    const result = await prisma.resolvedMention.updateMany({
      where: { brandId: { in: fromIds } },
      data: { brandId: toId, matchType: "consolidated" },
    });
    updatedMentions += result.count;
  }

  const allMentions = await prisma.resolvedMention.findMany({
    orderBy: [{ responseId: "asc" }, { brandId: "asc" }, { position: "asc" }],
  });
  const seen = new Set<string>();
  const dupeIds: string[] = [];
  for (const m of allMentions) {
    const key = `${m.responseId}:${m.brandId}`;
    if (seen.has(key)) dupeIds.push(m.id);
    else seen.add(key);
  }
  if (dupeIds.length > 0) {
    await prisma.resolvedMention.deleteMany({ where: { id: { in: dupeIds } } });
  }

  let aliasesCreated = 0;
  for (const brand of brands) {
    const preferred = preferredCanonicalName(brand.canonicalName);
    if (preferred === brand.canonicalName) continue;

    const target = brands.find((b) => b.canonicalName === preferred);
    if (!target) continue;

    const exists = await prisma.brandAlias.findFirst({
      where: { alias: brand.canonicalName },
    });
    if (!exists) {
      try {
        await prisma.brandAlias.create({
          data: {
            brandId: target.id,
            alias: brand.canonicalName,
            source: "consolidate",
          },
        });
        aliasesCreated++;
      } catch {
        // unique constraint
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        updatedMentions,
        deletedDupes: dupeIds.length,
        aliasesCreated,
        preferredRules: Object.keys(PREFERRED_CANONICAL).length,
      },
      null,
      2
    )
  );

  return { updatedMentions, deletedDupes: dupeIds.length, aliasesCreated };
}
