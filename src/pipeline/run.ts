import { collectAll } from "./collect";
import { extractWeek } from "./extract";
import { normalizeWeek } from "./normalize";
import { classifyAllBrands } from "./classify-entities";
import { scoreAll } from "./score";
import { canPublishToBlob } from "@/lib/blob-publish";
import { publishLeaderboards } from "./publish";
import { getCurrentWeek } from "@/lib/week";
import { prisma } from "@/lib/db";

export async function runFullPipeline(week?: string) {
  const w = week ?? getCurrentWeek();
  const run = await prisma.pipelineRun.create({
    data: { week: w, status: "running", currentStep: "collecting" },
  });
  console.log(`[Pipeline] Starting for ${w}`);

  try {
    console.log("[1/6] Collecting...");
    const collectResults = await collectAll(w);
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { collectedCount: collectResults.length, currentStep: "extracting" },
    });
    console.log(`[1/6] Collected ${collectResults.length} responses`);

    console.log("[2/6] Extracting...");
    const mentionCount = await extractWeek(w);
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { extractedCount: mentionCount, currentStep: "normalizing" },
    });
    console.log(`[2/6] Extracted ${mentionCount} mentions`);

    console.log("[3/6] Normalizing...");
    const resolved = await normalizeWeek(w);
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { resolvedCount: resolved, currentStep: "classifying" },
    });
    console.log(`[3/6] Resolved ${resolved} mentions`);

    console.log("[4/6] Classifying entities...");
    const classified = await classifyAllBrands();
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { classifiedCount: classified, currentStep: "scoring" },
    });
    console.log(`[4/6] Classified ${classified} brands`);

    console.log("[5/6] Scoring...");
    await scoreAll(w);
    const snapshotCount = await prisma.snapshot.count({ where: { week: w } });
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { snapshotCount, currentStep: "publishing" },
    });
    console.log(`[5/6] Scoring complete (${snapshotCount} snapshots)`);

    let manifestUrl: string | null = null;
    if (canPublishToBlob()) {
      console.log("[6/6] Publishing leaderboard snapshots...");
      manifestUrl = await publishLeaderboards(w);
      console.log("[6/6] Publishing complete");
    } else {
      console.warn(
        "[6/6] Blob credentials missing; skipped publishing snapshots (need BLOB_READ_WRITE_TOKEN or Vercel Blob connection)"
      );
    }

    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: "success",
        currentStep: null,
        manifestUrl,
        finishedAt: new Date(),
      },
    });
    console.log(`[Pipeline] Done for ${w} (run ${run.id})`);
    return { runId: run.id, week: w, status: "success" as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        errorMessage: message.slice(0, 4000),
        finishedAt: new Date(),
      },
    });
    console.error(`[Pipeline] Failed for ${w} (run ${run.id})`, error);
    throw error;
  }
}
