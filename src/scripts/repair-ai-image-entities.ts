/**
 * One-shot repair for AI Image entity pollution.
 * Usage: npx tsx src/scripts/repair-ai-image-entities.ts
 */
import "dotenv/config";

import { preferredCanonicalName } from "@/lib/brand-canonical";
import { classifyEntity } from "@/lib/brand-entities";
import { prisma } from "@/lib/db";
import { normalizeBrandKey } from "@/lib/brand-keys";
import { consolidateBrands } from "@/pipeline/consolidate";
import { classifyAllBrands } from "@/pipeline/classify-entities";
import { scoreCategory } from "@/pipeline/score";

const CATEGORY = "AI Image / Video Tools";

const POISON_ALIASES = [
  "Leonardo",
  "SAP Leonardo",
  "DALL·E",
  "DALL-E",
  "DALL-E 2",
  "DALL-E 3",
  "OpenAI DALL·E",
  "OpenAI's DALL-E",
];

const MERGES: Array<[string, string]> = [
  ["Leonardo", "Leonardo.ai"],
  ["Midjourney v6", "Midjourney"],
  ["Midjourney v5", "Midjourney"],
  ["Runway Gen-3 Alpha", "Runway"],
  ["DALL-E", "DALL·E"],
  ["DALL-E 2", "DALL·E"],
  ["DALL-E 3", "DALL·E"],
  ["OpenAI DALL·E", "DALL·E"],
  ["ChatGPT / GPT Image", "DALL·E"],
  ["ChatGPT / GPT Image 2", "DALL·E"],
  ["ChatGPT / GPT-4o or GPT Image", "DALL·E"],
  ["Synthesys AI Studio", "Synthesys"],
  ["Nano Banana 2", "Gemini"],
  ["Nano Banana", "Gemini"],
];

type BrandRow = { id: string; canonicalName: string };

async function loadBrandIndex() {
  const brands = await prisma.brand.findMany({
    select: { id: true, canonicalName: true },
  });
  const byName = new Map<string, BrandRow>();
  const byKey = new Map<string, BrandRow>();
  for (const brand of brands) {
    byName.set(brand.canonicalName, brand);
    byKey.set(normalizeBrandKey(brand.canonicalName), brand);
  }
  return { byName, byKey };
}

async function ensureBrand(
  canonicalName: string,
  index: Awaited<ReturnType<typeof loadBrandIndex>>
) {
  const existingName = index.byName.get(canonicalName);
  if (existingName) return existingName;

  const key = normalizeBrandKey(canonicalName);
  const existingKey = index.byKey.get(key);
  if (existingKey) {
    if (existingKey.canonicalName !== canonicalName) {
      const updated = await prisma.brand.update({
        where: { id: existingKey.id },
        data: { canonicalName },
        select: { id: true, canonicalName: true },
      });
      index.byName.delete(existingKey.canonicalName);
      index.byName.set(canonicalName, updated);
      index.byKey.set(key, updated);
      return updated;
    }
    return existingKey;
  }

  const rule = classifyEntity(canonicalName);
  const created = await prisma.brand.create({
    data: {
      canonicalName,
      entityType: rule.type,
      rankingEnabled: rule.rankingEnabled,
      entityTypeSource: "rule",
    },
    select: { id: true, canonicalName: true },
  });
  index.byName.set(canonicalName, created);
  index.byKey.set(key, created);
  return created;
}

async function main() {
  console.log("[repair] load brands");
  const index = await loadBrandIndex();
  console.log("[repair] brands", index.byName.size);

  console.log("[repair] ensure core brands");
  for (const name of ["Leonardo.ai", "DALL·E", "Synthesys", "Midjourney", "Runway", "Gemini"]) {
    await ensureBrand(name, index);
  }

  console.log("[repair] delete poison aliases");
  const deleted = await prisma.brandAlias.deleteMany({
    where: { alias: { in: POISON_ALIASES } },
  });
  console.log({ deleted: deleted.count });

  console.log("[repair] list distinct raw brands");
  const distinctRaws = await prisma.$queryRawUnsafe<{ raw_brand: string }[]>(
    `select distinct rm.raw_brand
     from resolved_mentions rm
     join responses r on r.id = rm.response_id
     where r.category = $1`,
    CATEGORY
  );
  console.log("[repair] distinct raws", distinctRaws.length);

  let moved = 0;
  for (let i = 0; i < distinctRaws.length; i++) {
    const raw = distinctRaws[i]!.raw_brand;
    const preferred = preferredCanonicalName(raw);
    const target = await ensureBrand(preferred, index);
    const result = await prisma.$executeRawUnsafe(
      `update resolved_mentions rm
       set brand_id = $1::text, match_type = 'preferred_repair'
       from responses r
       where rm.response_id = r.id
         and r.category = $2
         and rm.raw_brand = $3
         and rm.brand_id <> $1::text`,
      target.id,
      CATEGORY,
      raw
    );
    moved += Number(result);
    if ((i + 1) % 50 === 0 || i === distinctRaws.length - 1) {
      console.log(`[repair] remap ${i + 1}/${distinctRaws.length} moved=${moved}`);
    }
  }

  const deduped = await prisma.$executeRawUnsafe(
    `delete from resolved_mentions
     where id in (
       select id from (
         select rm.id,
                row_number() over (
                  partition by rm.response_id, rm.brand_id
                  order by rm.position asc, rm.id asc
                ) as rn
         from resolved_mentions rm
         join responses r on r.id = rm.response_id
         where r.category = $1
       ) t
       where rn > 1
     )`,
    CATEGORY
  );
  console.log("[repair] deduped", Number(deduped));

  console.log("[repair] merges");
  let merged = 0;
  for (const [sourceName, targetName] of MERGES) {
    const source = index.byName.get(sourceName);
    if (!source) continue;
    const target = await ensureBrand(targetName, index);
    if (source.id === target.id) continue;

    await prisma.$executeRawUnsafe(
      `update resolved_mentions rm
       set brand_id = $1::text, match_type = 'consolidated'
       where rm.brand_id = $2
         and not exists (
           select 1 from resolved_mentions x
           where x.response_id = rm.response_id and x.brand_id = $1::text
         )`,
      target.id,
      source.id
    );
    await prisma.resolvedMention.deleteMany({ where: { brandId: source.id } });
    await prisma.brand.update({
      where: { id: source.id },
      data: {
        rankingEnabled: false,
        entityType: "model",
        entityTypeSource: "manual",
        parentBrandId: target.id,
      },
    });
    const aliasExists = await prisma.brandAlias.findUnique({ where: { alias: sourceName } });
    if (!aliasExists) {
      await prisma.brandAlias.create({
        data: { brandId: target.id, alias: sourceName, source: "entity-audit" },
      });
    }
    merged++;
  }

  const sap = index.byName.get("SAP Leonardo");
  if (sap) {
    await prisma.brand.update({
      where: { id: sap.id },
      data: {
        rankingEnabled: false,
        entityType: "platform",
        entityTypeSource: "manual",
      },
    });
  }
  console.log({ merged, sapDisabled: Boolean(sap) });

  console.log("[repair] consolidate");
  await consolidateBrands();

  console.log("[repair] classify");
  await classifyAllBrands();

  // Re-disable after classify (rule source only updates rule-sourced rows;
  // manual entityTypeSource is preserved — still re-assert SAP / merges).
  for (const [sourceName, targetName] of MERGES) {
    const source = await prisma.brand.findFirst({ where: { canonicalName: sourceName } });
    const target = await prisma.brand.findFirst({ where: { canonicalName: targetName } });
    if (!source || !target || source.id === target.id) continue;
    await prisma.brand.update({
      where: { id: source.id },
      data: {
        rankingEnabled: false,
        entityType: "model",
        entityTypeSource: "manual",
        parentBrandId: target.id,
      },
    });
  }
  if (sap) {
    await prisma.brand.update({
      where: { id: sap.id },
      data: {
        rankingEnabled: false,
        entityType: "platform",
        entityTypeSource: "manual",
      },
    });
  }

  const weeks = await prisma.snapshot.findMany({
    where: { category: CATEGORY, engine: null },
    distinct: ["week"],
    select: { week: true },
    orderBy: { week: "desc" },
  });
  for (const { week } of weeks) {
    console.log(`[repair] scoring ${week}`);
    await scoreCategory(week, CATEGORY, { force: true });
  }

  const topWeek = weeks[0]?.week;
  if (topWeek) {
    const rows = await prisma.snapshot.findMany({
      where: { category: CATEGORY, week: topWeek, engine: null, rank: { lte: 20 } },
      orderBy: { rank: "asc" },
      include: { brand: { select: { canonicalName: true } } },
    });
    console.log(
      `\nTop20 ${topWeek}`,
      rows.map((r) => ({
        rank: r.rank,
        name: r.brand.canonicalName,
        score: r.score,
        appearanceRate: r.appearanceRate,
        avgRank: r.avgRank,
        modelCoverage: r.modelCoverage,
      }))
    );
  }

  console.log("[repair] done", { weeks: weeks.length });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
