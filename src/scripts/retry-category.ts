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
import { ENGINES, type Engine } from "@/lib/constants";

const week = process.argv[2];
const category = process.argv[3];
const engineArg = process.argv[4];
if (!week || !category || !engineArg) {
  throw new Error(
    'Usage: npm run retry-category -- "Week of YYYY-MM-DD" "Category" <engine>'
  );
}
if (!ENGINES.includes(engineArg as Engine)) {
  throw new Error(`Unknown engine "${engineArg}". Expected one of: ${ENGINES.join(", ")}`);
}
const engine = engineArg as Engine;

async function main() {
  console.log(`[Retry] Collecting failed responses for ${engine} / ${category} / ${week}`);
  await collectCategory(category, week, undefined, engine);
  await extractWeek(week);
  await normalizeWeek(week);
  await consolidateBrands();
  await classifyAllBrands();
  await scoreCategory(week, category, { force: true });
  await publishLeaderboards(week, { updateLatest: true });
  const snapshotCount = await prisma.snapshot.count({ where: { week } });
  console.log(JSON.stringify({ week, category, snapshotCount }));
}

main().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
