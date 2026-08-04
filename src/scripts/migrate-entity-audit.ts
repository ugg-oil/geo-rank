import "dotenv/config";

import { prisma } from "@/lib/db";
import { ENTITY_AUDIT, type EntityAuditEntry } from "@/lib/entity-audit";
import { normalizeBrandKey } from "@/lib/brand-keys";

const execute = process.argv.includes("--execute");

type BrandRecord = Awaited<ReturnType<typeof prisma.brand.findMany>>[number];

const entries = ENTITY_AUDIT.filter(
  (entry) => entry.status === "ready_for_migration"
);

function isMergeLike(entry: EntityAuditEntry) {
  return entry.action === "rename" || entry.action === "merge";
}

async function findBrand(name: string) {
  const exact = await prisma.brand.findUnique({ where: { canonicalName: name } });
  if (exact) return exact;

  const candidates = await prisma.brand.findMany();
  return candidates.find(
    (brand) => normalizeBrandKey(brand.canonicalName) === normalizeBrandKey(name)
  ) ?? null;
}

async function moveMentions(sourceId: string, targetId: string) {
  const sourceMentions = await prisma.resolvedMention.findMany({
    where: { brandId: sourceId },
    select: { id: true, responseId: true },
  });
  const targetResponseIds = new Set(
    (
      await prisma.resolvedMention.findMany({
        where: { brandId: targetId },
        select: { responseId: true },
      })
    ).map((mention) => mention.responseId)
  );

  let moved = 0;
  let deletedDuplicates = 0;
  for (const mention of sourceMentions) {
    if (targetResponseIds.has(mention.responseId)) {
      await prisma.resolvedMention.delete({ where: { id: mention.id } });
      deletedDuplicates++;
      continue;
    }
    await prisma.resolvedMention.update({
      where: { id: mention.id },
      data: { brandId: targetId, matchType: "consolidated" },
    });
    targetResponseIds.add(mention.responseId);
    moved++;
  }

  return { moved, deletedDuplicates };
}

async function ensureAlias(brandId: string, alias: string) {
  const existing = await prisma.brandAlias.findUnique({ where: { alias } });
  if (existing) return false;
  await prisma.brandAlias.create({
    data: { brandId, alias, source: "entity-audit" },
  });
  return true;
}

async function resolveParentId(parentCompany: string | undefined, brands: BrandRecord[]) {
  if (!parentCompany) return null;
  const parent = brands.find(
    (brand) => normalizeBrandKey(brand.canonicalName) === normalizeBrandKey(parentCompany)
  );
  return parent?.id ?? null;
}

async function migrateEntry(entry: EntityAuditEntry, brands: BrandRecord[]) {
  const source = await findBrand(entry.sourceName);
  if (!source) {
    return { source: entry.sourceName, result: "missing", details: "No matching Brand row" };
  }

  if (isMergeLike(entry)) {
    if (!entry.canonicalName) throw new Error(`Missing target for ${entry.sourceName}`);
    const target = await findBrand(entry.canonicalName);

    if (target && target.id !== source.id) {
      const mentionResult = await moveMentions(source.id, target.id);
      const aliasCreated = await ensureAlias(target.id, source.canonicalName);
      await prisma.brand.update({
        where: { id: source.id },
        data: {
          entityType: "unknown",
          rankingEnabled: false,
          entityTypeSource: "manual",
        },
      });
      return {
        source: source.canonicalName,
        result: "merged",
        target: target.canonicalName,
        ...mentionResult,
        aliasCreated,
      };
    }

    const aliasCreated = await ensureAlias(source.id, entry.sourceName);
    await prisma.brand.update({
      where: { id: source.id },
      data: { canonicalName: entry.canonicalName },
    });
    return {
      source: source.canonicalName,
      result: "renamed",
      target: entry.canonicalName,
      aliasCreated,
    };
  }

  const parentBrandId = await resolveParentId(entry.parentCompany, brands);
  const data: {
    entityType?: string;
    rankingEnabled?: boolean;
    entityTypeSource?: string;
    parentBrandId?: string | null;
  } = {};

  if (entry.action === "reclassify") {
    data.entityType = "company";
    data.rankingEnabled = false;
    data.entityTypeSource = "manual";
    data.parentBrandId = null;
  } else if (entry.action === "exclude") {
    data.entityType = "platform";
    data.rankingEnabled = false;
    data.entityTypeSource = "manual";
    data.parentBrandId = parentBrandId;
  } else {
    return {
      source: source.canonicalName,
      result: "category-rule-only",
      details: "Handled by category-aware scoring rule",
    };
  }

  await prisma.brand.update({ where: { id: source.id }, data });
  return { source: source.canonicalName, result: "classified", ...data };
}

async function main() {
  const brands = await prisma.brand.findMany();
  console.log(`${execute ? "EXECUTE" : "DRY-RUN"}: ${entries.length} ready entries`);

  for (const entry of entries) {
    const source = await findBrand(entry.sourceName);
    const target = entry.canonicalName ? await findBrand(entry.canonicalName) : null;
    console.log(
      JSON.stringify({
        source: entry.sourceName,
        sourceId: source?.id ?? null,
        target: entry.canonicalName ?? null,
        targetId: target?.id ?? null,
        action: entry.action,
      })
    );
  }

  if (!execute) {
    console.log("No database changes made. Re-run with --execute to apply this plan.");
    return;
  }

  for (const entry of entries) {
    console.log(JSON.stringify(await migrateEntry(entry, brands)));
  }
  console.log("Entity migration complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
