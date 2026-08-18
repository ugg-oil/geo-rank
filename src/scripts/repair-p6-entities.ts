/**
 * P6: apply preferred merges + entity-audit merges, classify, force-rescore all boards.
 * Usage: npx tsx src/scripts/repair-p6-entities.ts
 */
import "dotenv/config";

import { PREFERRED_CANONICAL } from "@/lib/brand-canonical";
import { classifyEntity } from "@/lib/brand-entities";
import { prisma } from "@/lib/db";
import { ENTITY_AUDIT } from "@/lib/entity-audit";
import { normalizeBrandKey } from "@/lib/brand-keys";
import { consolidateBrands } from "@/pipeline/consolidate";
import { classifyAllBrands } from "@/pipeline/classify-entities";
import { scoreCategory } from "@/pipeline/score";

type BrandRow = { id: string; canonicalName: string };

async function loadIndex() {
  const brands = await prisma.brand.findMany({
    select: { id: true, canonicalName: true },
  });
  const byName = new Map<string, BrandRow>();
  const byKey = new Map<string, BrandRow>();
  for (const b of brands) {
    byName.set(b.canonicalName, b);
    byKey.set(normalizeBrandKey(b.canonicalName), b);
  }
  return { byName, byKey };
}

async function ensureBrand(
  canonicalName: string,
  index: Awaited<ReturnType<typeof loadIndex>>
) {
  const hit = index.byName.get(canonicalName);
  if (hit) return hit;
  const key = normalizeBrandKey(canonicalName);
  const byKey = index.byKey.get(key);
  if (byKey) {
    if (byKey.canonicalName !== canonicalName) {
      const updated = await prisma.brand.update({
        where: { id: byKey.id },
        data: { canonicalName },
        select: { id: true, canonicalName: true },
      });
      index.byName.delete(byKey.canonicalName);
      index.byName.set(canonicalName, updated);
      index.byKey.set(key, updated);
      return updated;
    }
    return byKey;
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

async function mergeBrand(
  sourceName: string,
  targetName: string,
  index: Awaited<ReturnType<typeof loadIndex>>
) {
  const source = index.byName.get(sourceName);
  if (!source) return false;
  const target = await ensureBrand(targetName, index);
  if (source.id === target.id) return false;

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
  return true;
}

async function remapByPreferred(index: Awaited<ReturnType<typeof loadIndex>>) {
  for (const name of new Set(Object.values(PREFERRED_CANONICAL))) {
    await ensureBrand(name, index);
  }

  let movedBrands = 0;
  for (const [variantKey, preferred] of Object.entries(PREFERRED_CANONICAL)) {
    const source = index.byKey.get(variantKey);
    if (!source) continue;
    if (normalizeBrandKey(source.canonicalName) === normalizeBrandKey(preferred)) continue;
    const ok = await mergeBrand(source.canonicalName, preferred, index);
    if (ok) movedBrands++;
  }

  // Batch-update mentions whose raw_brand key is a preferred variant.
  let movedMentions = 0;
  for (const [variantKey, preferred] of Object.entries(PREFERRED_CANONICAL)) {
    const target = await ensureBrand(preferred, index);
    // Match raw brands that normalize to this variant key
    const n = await prisma.$executeRawUnsafe(
      `update resolved_mentions rm
       set brand_id = $1::text, match_type = 'preferred_repair'
       where rm.brand_id <> $1::text
         and lower(trim(rm.raw_brand)) = $2`,
      target.id,
      variantKey
    );
    // Also try common display forms stored as alias-like raws
    const n2 = await prisma.$executeRawUnsafe(
      `update resolved_mentions rm
       set brand_id = $1::text, match_type = 'preferred_repair'
       from brands b
       where rm.brand_id = b.id
         and rm.brand_id <> $1::text
         and lower(trim(b.canonical_name)) = $2`,
      target.id,
      variantKey
    );
    movedMentions += Number(n) + Number(n2);
  }

  const deduped = await prisma.$executeRawUnsafe(
    `delete from resolved_mentions
     where id in (
       select id from (
         select id,
                row_number() over (
                  partition by response_id, brand_id
                  order by position asc, id asc
                ) as rn
         from resolved_mentions
       ) t
       where rn > 1
     )`
  );

  return { movedBrands, movedMentions, deduped: Number(deduped) };
}

async function applyAuditMerges(index: Awaited<ReturnType<typeof loadIndex>>) {
  let merged = 0;
  let excluded = 0;
  for (const entry of ENTITY_AUDIT) {
    if (entry.status !== "ready_for_migration") continue;
    if (entry.action === "merge" || entry.action === "rename") {
      if (!entry.canonicalName) continue;
      const ok = await mergeBrand(entry.sourceName, entry.canonicalName, index);
      if (ok) merged++;
    } else if (entry.action === "exclude" || entry.action === "reclassify") {
      const brand = index.byName.get(entry.sourceName);
      if (!brand) continue;
      await prisma.brand.update({
        where: { id: brand.id },
        data: {
          rankingEnabled: false,
          entityType: entry.action === "exclude" ? "platform" : "company",
          entityTypeSource: "manual",
        },
      });
      excluded++;
    }
  }
  return { merged, excluded };
}

async function rescoreAll() {
  const pairs = await prisma.snapshot.findMany({
    where: { engine: null },
    distinct: ["week", "category"],
    select: { week: true, category: true },
    orderBy: [{ week: "desc" }, { category: "asc" }],
  });
  console.log(`[p6] rescoring ${pairs.length} category×week boards`);
  for (let i = 0; i < pairs.length; i++) {
    const { week, category } = pairs[i]!;
    process.stdout.write(`[p6] ${i + 1}/${pairs.length} ${week} · ${category}\n`);
    await scoreCategory(week, category, { force: true });
  }
  return pairs.length;
}

async function verify() {
  const checks: string[] = [];

  const hr = await prisma.snapshot.findMany({
    where: {
      category: "HR Software",
      week: "Week of 2026-08-10",
      engine: null,
      brand: { canonicalName: "SAP Leonardo" },
    },
  });
  checks.push(hr.length === 0 ? "OK HR no SAP Leonardo" : "FAIL HR still has SAP Leonardo");

  const image = await prisma.snapshot.findMany({
    where: {
      category: "AI Image / Video Tools",
      week: "Week of 2026-08-10",
      engine: null,
      rank: { lte: 5 },
    },
    orderBy: { rank: "asc" },
    include: { brand: { select: { canonicalName: true } } },
  });
  checks.push(
    `AI Image top5: ${image.map((r) => r.brand.canonicalName).join(", ")}`
  );

  const lowApp = await prisma.snapshot.findMany({
    where: {
      engine: null,
      week: "Week of 2026-08-10",
      appearanceRate: { lt: 0.1 },
      modelCoverage: { lt: 2 / 6 - 0.001 },
    },
    include: { brand: { select: { canonicalName: true } } },
    take: 30,
  });
  // modelCoverage for 1 engine of 6 is ~0.1667 — gate uses engine count not coverage float.
  // Re-check via appearance only ghosts that also have cov implying 1 engine.
  const ghosts = lowApp.filter((r) => (r.modelCoverage ?? 0) < 0.34);
  checks.push(
    ghosts.length === 0
      ? "OK no low-app/low-cov overall rows on 2026-08-10"
      : `WARN ${ghosts.length} low-app/low-cov rows remain e.g. ${ghosts
          .slice(0, 5)
          .map((g) => `${g.category}:${g.brand.canonicalName}`)
          .join("; ")}`
  );

  const meeting = await prisma.snapshot.findMany({
    where: {
      category: "AI Meeting Assistants",
      week: "Week of 2026-08-10",
      engine: null,
      brand: {
        canonicalName: { in: ["Otter.ai Pro Max", "Fireflies.ai 3.0"] },
      },
    },
  });
  checks.push(
    meeting.length === 0
      ? "OK Meeting SKUs off board"
      : "FAIL Meeting SKUs still on board"
  );

  return checks;
}

async function main() {
  console.log("[p6] load brands");
  const index = await loadIndex();

  console.log("[p6] ensure preferred targets");
  for (const name of new Set(Object.values(PREFERRED_CANONICAL))) {
    await ensureBrand(name, index);
  }

  console.log("[p6] remap by preferred");
  console.log(await remapByPreferred(index));

  console.log("[p6] entity-audit merges/excludes");
  // refresh index names after remaps
  const index2 = await loadIndex();
  console.log(await applyAuditMerges(index2));

  console.log("[p6] consolidate");
  await consolidateBrands();

  console.log("[p6] classify");
  await classifyAllBrands();

  // Re-assert audit excludes/merges after classify
  const index3 = await loadIndex();
  console.log("[p6] re-apply audit", await applyAuditMerges(index3));

  console.log("[p6] rescore all");
  await rescoreAll();

  console.log("[p6] verify");
  for (const line of await verify()) console.log(" ", line);

  console.log("[p6] done");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
