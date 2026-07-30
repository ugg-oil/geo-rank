import { prisma } from "@/lib/db";
import { classifyEntity } from "@/lib/brand-entities";
import { normalizeBrandKey } from "@/lib/brand-canonical";

export async function classifyBrandById(brandId: string) {
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) return null;

  if (brand.entityTypeSource !== "rule") return brand;

  const rule = classifyEntity(brand.canonicalName);
  let parentBrandId: string | null = null;

  if (rule.parent) {
    const parent = await prisma.brand.findFirst({
      where: { canonicalName: rule.parent },
    });
    if (parent) parentBrandId = parent.id;
  }

  return prisma.brand.update({
    where: { id: brandId },
    data: {
      entityType: rule.type,
      rankingEnabled: rule.rankingEnabled,
      parentBrandId,
      entityTypeSource: "rule",
    },
  });
}

export async function classifyAllBrands() {
  const brands = await prisma.brand.findMany();
  const nameToId = new Map(
    brands.map((b) => [normalizeBrandKey(b.canonicalName), b.id])
  );

  let updated = 0;
  for (const brand of brands) {
    const rule = classifyEntity(brand.canonicalName);
    let parentBrandId: string | null = null;

    if (rule.parent) {
      const parentId = nameToId.get(normalizeBrandKey(rule.parent));
      if (parentId) parentBrandId = parentId;
    }

    // Manual/LLM classifications are decisions, not defaults. Preserve them
    // when the rule table is expanded or reprocess is run again.
    if (brand.entityTypeSource !== "rule") continue;

    const changed =
      brand.entityType !== rule.type ||
      brand.rankingEnabled !== rule.rankingEnabled ||
      brand.parentBrandId !== parentBrandId;

    if (changed) {
      await prisma.brand.update({
        where: { id: brand.id },
        data: {
          entityType: rule.type,
          rankingEnabled: rule.rankingEnabled,
          parentBrandId,
        },
      });
      updated++;
    }
  }

  console.log(
    JSON.stringify({ total: brands.length, updated }, null, 2)
  );
  return updated;
}

export async function classifyWeekBrands(week: string) {
  const responses = await prisma.response.findMany({
    where: { week },
    select: { id: true },
  });
  const responseIds = responses.map((response) => response.id);

  const brandIds = await prisma.resolvedMention.findMany({
    where: { responseId: { in: responseIds } },
    select: { brandId: true },
    distinct: ["brandId"],
  });

  for (const { brandId } of brandIds) {
    await classifyBrandById(brandId);
  }

  return brandIds.length;
}
