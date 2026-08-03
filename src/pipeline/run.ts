import { collectAll } from "./collect";
import { extractWeek } from "./extract";
import { normalizeWeek } from "./normalize";
import { classifyAllBrands } from "./classify-entities";
import { scoreAll } from "./score";
import { canPublishToBlob } from "@/lib/blob-publish";
import { publishLeaderboards } from "./publish";
import { getCurrentWeek } from "@/lib/week";
import { prisma } from "@/lib/db";
import {
  PipelineTimeoutError,
  PIPELINE_RUN_STALE_TIMEOUT_MS,
  PIPELINE_STAGE_TIMEOUT_MS,
} from "@/lib/pipeline-timeouts";

async function runStage<T>(stage: string, work: Promise<T>, timeoutMs = PIPELINE_STAGE_TIMEOUT_MS) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new PipelineTimeoutError(stage, timeoutMs)),
      timeoutMs
    );
  });

  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function runFullPipeline(week?: string) {
  const w = week ?? getCurrentWeek();
  const existingRun = await prisma.pipelineRun.findFirst({
    where: { week: w, status: "running" },
    orderBy: { startedAt: "desc" },
  });
  if (existingRun) {
    const age = Date.now() - existingRun.startedAt.getTime();
    if (age < PIPELINE_RUN_STALE_TIMEOUT_MS) {
      throw new Error(`Pipeline already running for ${w} (run ${existingRun.id})`);
    }
    await prisma.pipelineRun.update({
      where: { id: existingRun.id },
      data: {
        status: "failed",
        currentStep: null,
        errorMessage: `Marked stale after ${Math.round(age / 60_000)} minutes`,
        finishedAt: new Date(),
      },
    });
  }
  const run = await prisma.pipelineRun.create({
    data: { week: w, status: "running", currentStep: "collecting" },
  });
  console.log(`[Pipeline] Starting for ${w}`);

  try {
    console.log("[1/6] Collecting...");
    const collectResults = await collectAll(w);
    const collectedCount = await prisma.response.count({
      where: { week: w, status: "ok" },
    });
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { collectedCount, currentStep: "extracting" },
    });
    console.log(`[1/6] Collected ${collectedCount} successful responses (${collectResults.length} attempts)`);

    console.log("[2/6] Extracting...");
    const mentionCount = await runStage("extraction", extractWeek(w));
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { extractedCount: mentionCount, currentStep: "normalizing" },
    });
    console.log(`[2/6] Extracted ${mentionCount} mentions`);

    console.log("[3/6] Normalizing...");
    const resolved = await runStage("normalization", normalizeWeek(w));
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { resolvedCount: resolved, currentStep: "classifying" },
    });
    console.log(`[3/6] Resolved ${resolved} mentions`);

    console.log("[4/6] Classifying entities...");
    const classified = await runStage("classification", classifyAllBrands());
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { classifiedCount: classified, currentStep: "scoring" },
    });
    console.log(`[4/6] Classified ${classified} brands`);

    console.log("[5/6] Scoring...");
    await runStage("scoring", scoreAll(w));
    const snapshotCount = await prisma.snapshot.count({ where: { week: w } });
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { snapshotCount, currentStep: "publishing" },
    });
    console.log(`[5/6] Scoring complete (${snapshotCount} snapshots)`);

    let manifestUrl: string | null = null;
    if (canPublishToBlob()) {
      console.log("[6/6] Publishing leaderboard snapshots...");
      manifestUrl = await runStage("publishing", publishLeaderboards(w));
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
