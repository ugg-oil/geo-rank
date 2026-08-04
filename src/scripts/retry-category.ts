import { config } from "dotenv";
const baseEnv = config({ path: ".env" }).parsed;
config({ path: ".env.local" });
if ((process.env.OPENROUTER_API_KEY?.length ?? 0) < 40 && baseEnv?.OPENROUTER_API_KEY) {
  process.env.OPENROUTER_API_KEY = baseEnv.OPENROUTER_API_KEY;
}

import { collectCategory } from "@/pipeline/collect";
import { extractWeek } from "@/pipeline/extract";
import { normalizeWeek } from "@/pipeline/normalize";
import { consolidateBrands } from "@/pipeline/consolidate";
import { classifyAllBrands } from "@/pipeline/classify-entities";
import { scoreCategory } from "@/pipeline/score";
import { publishLeaderboards } from "@/pipeline/publish";
import { prisma } from "@/lib/db";

const week = process.argv[2];
const category = process.argv[3];
if (!week || !category) throw new Error('Usage: npm run retry-category -- "Week of YYYY-MM-DD" "Category"');

async function main() {
  console.log(`[Retry] Collecting failed responses for ${category} / ${week}`);
  await collectCategory(category, week);
  await extractWeek(week);
  await normalizeWeek(week);
  await consolidateBrands();
  await classifyAllBrands();
  await scoreCategory(week, category, { force: true });
  await publishLeaderboards(week, { updateLatest: false });
  const snapshotCount = await prisma.snapshot.count({ where: { week } });
  console.log(JSON.stringify({ week, category, snapshotCount }));
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
