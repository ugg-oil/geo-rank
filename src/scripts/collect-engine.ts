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
import { scoreAll } from "@/pipeline/score";
import { publishLeaderboards } from "@/pipeline/publish";
import { prisma } from "@/lib/db";
import { CATEGORIES, COLLECTION_ENGINES, isEngine, type Engine } from "@/lib/constants";

const week = process.argv[2];
const engineArg = process.argv[3];
if (!week?.startsWith("Week of ") || !engineArg) {
  throw new Error('Usage: npm run collect-engine -- "Week of YYYY-MM-DD" <engine>');
}
if (!isEngine(engineArg) || !COLLECTION_ENGINES.includes(engineArg)) {
  throw new Error(`Unknown engine "${engineArg}". Expected one of: ${COLLECTION_ENGINES.join(", ")}`);
}
const engine = engineArg as Engine;

async function main() {
  for (const category of CATEGORIES) {
    console.log(`[CollectEngine] ${engine} / ${category} / ${week}`);
    const results = await collectCategory(category, week, undefined, engine);
    console.log(results.join("\n"));
  }

  console.log(`[CollectEngine] extract / normalize / score / publish`);
  await extractWeek(week);
  await normalizeWeek(week);
  await consolidateBrands();
  await classifyAllBrands();
  await scoreAll(week, { force: true });
  await publishLeaderboards(week, { updateLatest: true });

  const responses = await prisma.response.groupBy({
    by: ["category", "status"],
    where: { week, engine },
    _count: { id: true },
  });
  const snapshots = await prisma.snapshot.groupBy({
    by: ["category"],
    where: { week, engine },
    _count: { id: true },
  });
  console.log(JSON.stringify({ week, engine, responses, snapshots }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
