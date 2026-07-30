import { collectAll } from "./collect";
import { extractWeek } from "./extract";
import { normalizeWeek } from "./normalize";
import { classifyAllBrands } from "./classify-entities";
import { scoreAll } from "./score";
import { publishLeaderboards } from "./publish";
import { getCurrentWeek } from "@/lib/week";

export async function runFullPipeline(week?: string) {
  const w = week ?? getCurrentWeek();
  console.log(`[Pipeline] Starting for ${w}`);

  console.log("[1/5] Collecting...");
  const collectResults = await collectAll(w);
  console.log(`[1/5] Collected ${collectResults.length} responses`);

  console.log("[2/5] Extracting...");
  const mentionCount = await extractWeek(w);
  console.log(`[2/5] Extracted ${mentionCount} mentions`);

  console.log("[3/5] Normalizing...");
  const resolved = await normalizeWeek(w);
  console.log(`[3/5] Resolved ${resolved} mentions`);

  console.log("[4/5] Classifying entities...");
  const classified = await classifyAllBrands();
  console.log(`[4/5] Classified ${classified} brands`);

  console.log("[5/5] Scoring...");
  await scoreAll(w);
  console.log("[5/5] Scoring complete");

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    console.log("[6/6] Publishing leaderboard snapshots...");
    await publishLeaderboards(w);
    console.log("[6/6] Publishing complete");
  } else {
    console.warn("[6/6] BLOB_READ_WRITE_TOKEN missing; skipped publishing snapshots");
  }

  console.log(`[Pipeline] Done for ${w}`);
}
