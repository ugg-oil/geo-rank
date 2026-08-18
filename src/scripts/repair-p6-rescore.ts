/**
 * P6 continuation: classify + force-rescore all boards (merges already applied).
 * Usage: npx tsx src/scripts/repair-p6-rescore.ts
 */
import "dotenv/config";

import { prisma } from "@/lib/db";
import { classifyAllBrands } from "@/pipeline/classify-entities";
import { scoreCategory } from "@/pipeline/score";

async function main() {
  console.log("[p6] classify");
  await classifyAllBrands();

  // Keep SAP Leonardo / merged shells disabled
  await prisma.brand.updateMany({
    where: { canonicalName: "SAP Leonardo" },
    data: {
      rankingEnabled: false,
      entityType: "platform",
      entityTypeSource: "manual",
    },
  });

  const pairs = await prisma.snapshot.findMany({
    where: { engine: null },
    distinct: ["week", "category"],
    select: { week: true, category: true },
    orderBy: [{ week: "desc" }, { category: "asc" }],
  });
  console.log(`[p6] rescoring ${pairs.length} boards`);

  for (let i = 0; i < pairs.length; i++) {
    const { week, category } = pairs[i]!;
    console.log(`[p6] ${i + 1}/${pairs.length} ${week} · ${category}`);
    await scoreCategory(week, category, { force: true });
  }

  const hr = await prisma.snapshot.count({
    where: {
      category: "HR Software",
      week: "Week of 2026-08-10",
      engine: null,
      brand: { canonicalName: "SAP Leonardo" },
    },
  });
  const ghosts = await prisma.snapshot.findMany({
    where: {
      engine: null,
      week: "Week of 2026-08-10",
      appearanceRate: { lt: 0.1 },
      modelCoverage: { lt: 0.34 },
    },
    take: 15,
    include: { brand: { select: { canonicalName: true } } },
  });
  const image = await prisma.snapshot.findMany({
    where: {
      category: "AI Image / Video Tools",
      week: "Week of 2026-08-10",
      engine: null,
      rank: { lte: 7 },
    },
    orderBy: { rank: "asc" },
    include: { brand: { select: { canonicalName: true } } },
  });
  const meetingSku = await prisma.snapshot.count({
    where: {
      category: "AI Meeting Assistants",
      week: "Week of 2026-08-10",
      engine: null,
      brand: { canonicalName: { in: ["Otter.ai Pro Max", "Fireflies.ai 3.0"] } },
    },
  });

  console.log("verify HR SAP Leonardo count", hr);
  console.log("verify ghost-like rows", ghosts.length, ghosts.map((g) => `${g.category}:${g.brand.canonicalName}`));
  console.log(
    "verify AI Image top7",
    image.map((r) => `${r.rank}.${r.brand.canonicalName}`)
  );
  console.log("verify Meeting SKU count", meetingSku);
  console.log("[p6] done");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
