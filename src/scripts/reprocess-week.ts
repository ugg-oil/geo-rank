import { consolidateBrands } from "@/pipeline/consolidate";
import { classifyAllBrands } from "@/pipeline/classify-entities";
import { scoreAll } from "@/pipeline/score";
import { getCurrentWeek } from "@/lib/week";

const rawWeek = process.argv[2] === "--week" ? process.argv[3] : process.argv[2];
if (rawWeek && !rawWeek.startsWith("Week of")) {
  throw new Error('Usage: npm run reprocess -- [--week] "Week of YYYY-MM-DD"');
}
const week = rawWeek ?? getCurrentWeek();

async function main() {
  console.log(`[Reprocess] Consolidating brands and rewriting resolved mentions for ${week}...`);
  await consolidateBrands();

  console.log(`[Reprocess] Classifying entities...`);
  await classifyAllBrands();

  console.log(`[Reprocess] Re-scoring snapshots for ${week}...`);
  await scoreAll(week, { force: true });

  console.log(`[Reprocess] Done for ${week}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
