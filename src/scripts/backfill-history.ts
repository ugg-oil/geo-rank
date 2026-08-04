import { config } from "dotenv";
const baseEnv = config({ path: ".env" }).parsed;
config({ path: ".env.local" });
// Some local setups keep a short placeholder key in .env.local while .env
// contains the actual OpenRouter credential. Keep local Blob settings, but do
// not let an invalid short placeholder shadow the usable API key.
if ((process.env.OPENROUTER_API_KEY?.length ?? 0) < 40 && baseEnv?.OPENROUTER_API_KEY) {
  process.env.OPENROUTER_API_KEY = baseEnv.OPENROUTER_API_KEY;
}
import { BACKFILL_DATA_SOURCE, getDefaultBackfillWeeks } from "@/lib/backfill";
import { prisma } from "@/lib/db";
import { publishLeaderboards } from "@/pipeline/publish";
import { runFullPipeline } from "@/pipeline/run";
import { getCurrentWeek } from "@/lib/week";

const execute = process.argv.includes("--execute");
const currentWeek = getCurrentWeek();
const weeks = getDefaultBackfillWeeks(currentWeek);

async function prepareIncompleteWeek(week: string) {
  const snapshots = await prisma.snapshot.count({ where: { week } });
  if (snapshots > 0) return { removedResponses: 0, clearedExtractedMentions: 0 };

  const responses = await prisma.response.findMany({
    where: { week },
    orderBy: { createdAt: "asc" },
    select: { id: true, engine: true, promptId: true },
  });
  const retained = new Set<string>();
  const duplicateIds: string[] = [];
  for (const response of responses) {
    const key = `${response.engine}\u0000${response.promptId}`;
    if (retained.has(key)) duplicateIds.push(response.id);
    else retained.add(key);
  }

  const retainedIds = responses
    .filter((response) => !duplicateIds.includes(response.id))
    .map((response) => response.id);
  const extracted = await prisma.extractedMention.count({
    where: { responseId: { in: retainedIds } },
  });

  await prisma.$transaction([
    prisma.resolvedMention.deleteMany({ where: { responseId: { in: responses.map((response) => response.id) } } }),
    prisma.extractedMention.deleteMany({ where: { responseId: { in: responses.map((response) => response.id) } } }),
    prisma.response.deleteMany({ where: { id: { in: duplicateIds } } }),
  ]);

  return { removedResponses: duplicateIds.length, clearedExtractedMentions: extracted };
}

async function main() {
  const activePrompts = await prisma.prompt.count({ where: { active: true } });
  const requestsPerWeek = activePrompts * 3;
  const existing = await prisma.snapshot.groupBy({
    by: ["week"],
    where: { week: { in: weeks } },
    _count: { id: true },
  });
  const existingWeeks = new Set(existing.map((row) => row.week));
  const weeksToGenerate = weeks.filter((week) => !existingWeeks.has(week));

  console.log(
    JSON.stringify(
      {
        dataSource: BACKFILL_DATA_SOURCE,
        generatedAt: new Date().toISOString(),
        requestedWeeks: weeks,
        preservedWeeks: existing.map((row) => ({ week: row.week, count: row._count.id })),
        weeksToGenerate,
        activePrompts,
        estimatedModelRequests: requestsPerWeek * weeksToGenerate.length,
      },
      null,
      2
    )
  );

  if (!execute) {
    console.log("Dry run only. Re-run with --execute to generate historical estimates.");
    return;
  }

  try {
    for (const week of existingWeeks) {
      if (week === currentWeek) continue;
      console.log(`[Backfill] Publishing preserved historical week ${week}...`);
      await publishLeaderboards(week, { updateLatest: false });
    }
    for (const week of weeksToGenerate) {
      const cleanup = await prepareIncompleteWeek(week);
      if (cleanup.removedResponses || cleanup.clearedExtractedMentions) {
        console.log(`[Backfill] Reset incomplete ${week}: ${JSON.stringify(cleanup)}`);
      }
      console.log(`[Backfill] Generating estimate for ${week}...`);
      const run = await runFullPipeline(week, { publishLatest: false });
      const snapshotCount = await prisma.snapshot.count({ where: { week } });
      if (snapshotCount === 0) {
        await prisma.pipelineRun.update({
          where: { id: run.runId },
          data: {
            status: "failed",
            errorMessage: "Backfill produced zero snapshots; collection likely failed for every response.",
          },
        });
        throw new Error(`Backfill produced zero snapshots for ${week}`);
      }
      await prisma.pipelineRun.update({
        where: { id: run.runId },
        data: { status: BACKFILL_DATA_SOURCE },
      });
    }
  } finally {
    // Each historical pipeline run publishes its own immutable week files. Put
    // the real current week back at latest even if a later backfill step fails.
    console.log(`[Backfill] Restoring latest manifest to ${currentWeek}...`);
    await publishLeaderboards(currentWeek);
  }

  console.log("[Backfill] Historical estimates generated successfully.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
