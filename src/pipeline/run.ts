import { COLLECTION_ENGINES } from "@/lib/constants";
import { collectEngine } from "./collect";
import { extractWeek } from "./extract";
import { normalizeWeek } from "./normalize";
import { consolidateBrands } from "./consolidate";
import { classifyAllBrands } from "./classify-entities";
import { scoreAll } from "./score";
import { canPublishToBlob } from "@/lib/blob-publish";
import { publishLeaderboards } from "./publish";
import { getCurrentWeek } from "@/lib/week";
import { prisma } from "@/lib/db";
import {
  PipelineTimeoutError,
  PIPELINE_COLLECTION_TIMEOUT_MS,
  PIPELINE_RUN_STALE_TIMEOUT_MS,
  PIPELINE_STAGE_TIMEOUT_MS,
} from "@/lib/pipeline-timeouts";
import { errorContext, logPipelineEvent } from "@/lib/pipeline-observability";
import { verifyPublicCategoryPage } from "@/lib/pipeline-health";

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

export async function runFullPipeline(
  week?: string,
  options: { publishLatest?: boolean } = {}
) {
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
  logPipelineEvent({ event: "run_started", week: w, runId: run.id });

  const timedStage = async <T>(stage: string, work: () => Promise<T>) => {
    const startedAt = Date.now();
    logPipelineEvent({ event: "stage_started", week: w, runId: run.id, stage });
    const result = await runStage(stage, work());
    logPipelineEvent({ event: "stage_completed", week: w, runId: run.id, stage, durationMs: Date.now() - startedAt });
    return result;
  };

  try {
    const collectResults: string[] = [];
    for (const engine of COLLECTION_ENGINES) {
      const batch = await timedStage(`collecting:${engine}`, () => {
        const deadline = Date.now() + PIPELINE_COLLECTION_TIMEOUT_MS;
        return collectEngine(w, engine, deadline);
      });
      collectResults.push(...batch);
    }
    const collectedCount = await prisma.response.count({
      where: { week: w, status: "ok" },
    });
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { collectedCount, currentStep: "extracting" },
    });
    logPipelineEvent({ event: "collection_summary", week: w, runId: run.id, collectedCount, attemptedCount: collectResults.length });

    const mentionCount = await timedStage("extracting", () => extractWeek(w));
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { extractedCount: mentionCount, currentStep: "normalizing" },
    });
    logPipelineEvent({ event: "extraction_summary", week: w, runId: run.id, extractedCount: mentionCount });

    const resolved = await timedStage("normalizing", () => normalizeWeek(w));
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { resolvedCount: resolved, currentStep: "consolidating" },
    });
    logPipelineEvent({ event: "normalization_summary", week: w, runId: run.id, resolvedCount: resolved });

    await timedStage("consolidating", () => consolidateBrands());
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { currentStep: "classifying" },
    });

    const classified = await timedStage("classifying", () => classifyAllBrands());
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { classifiedCount: classified, currentStep: "scoring" },
    });
    logPipelineEvent({ event: "classification_summary", week: w, runId: run.id, classifiedCount: classified });

    await timedStage("scoring", () => scoreAll(w));
    const snapshotCount = await prisma.snapshot.count({ where: { week: w } });
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: { snapshotCount, currentStep: "publishing" },
    });
    logPipelineEvent({ event: "scoring_summary", week: w, runId: run.id, snapshotCount });

    let publication: Awaited<ReturnType<typeof publishLeaderboards>> | null = null;
    if (canPublishToBlob()) {
      publication = await timedStage("publishing", () =>
        publishLeaderboards(w, { updateLatest: options.publishLatest })
      );
      if (options.publishLatest ?? true) {
        await timedStage("public_smoke_check", () => verifyPublicCategoryPage(w));
      }
    } else {
      console.warn(
        "[7/7] Blob credentials missing; skipped publishing snapshots (need BLOB_READ_WRITE_TOKEN or Vercel Blob connection)"
      );
    }

    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: "success",
        currentStep: null,
        manifestUrl: publication?.manifestUrl ?? null,
        latestManifestUrl: publication?.latestManifestUrl ?? null,
        publishStatus: publication ? "success" : "skipped",
        publishedAt: publication ? new Date(publication.publishedAt) : null,
        finishedAt: new Date(),
      },
    });
    logPipelineEvent({ event: "run_completed", week: w, runId: run.id, snapshotCount });
    return { runId: run.id, week: w, status: "success" as const };
  } catch (error) {
    const details = errorContext(error);
    const message = details.message;
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        errorMessage: message.slice(0, 4000),
        finishedAt: new Date(),
      },
    });
    logPipelineEvent({ event: "run_failed", week: w, runId: run.id, error: details });
    throw error;
  }
}
