import { COLLECTION_ENGINES, type Engine, isEngine } from "@/lib/constants";
import { collectEngine } from "./collect";
import { extractWeek } from "./extract";
import { normalizeWeek } from "./normalize";
import { consolidateBrands } from "./consolidate";
import { classifyAllBrands } from "./classify-entities";
import { scoreAll } from "./score";
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

function collectStepFor(engine: Engine) {
  return `collecting:${engine}` as const;
}

function parseCollectEngine(step: string | null | undefined): Engine | null {
  if (!step?.startsWith("collecting:")) return null;
  const engine = step.slice("collecting:".length);
  return isEngine(engine) ? engine : null;
}

function nextStepAfterCollect(engine: Engine): string {
  const index = COLLECTION_ENGINES.indexOf(engine);
  if (index < 0 || index >= COLLECTION_ENGINES.length - 1) return "extracting";
  return collectStepFor(COLLECTION_ENGINES[index + 1]!);
}

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

async function touchRun(runId: string, data: Record<string, unknown> = {}) {
  await prisma.pipelineRun.update({
    where: { id: runId },
    data,
  });
}

async function failStaleRunning(week: string) {
  const existingRun = await prisma.pipelineRun.findFirst({
    where: { week, status: "running" },
    orderBy: { startedAt: "desc" },
  });
  if (!existingRun) return null;

  const anchor = existingRun.updatedAt.getTime();
  const age = Date.now() - anchor;
  if (age < PIPELINE_RUN_STALE_TIMEOUT_MS) {
    return existingRun;
  }

  await prisma.pipelineRun.update({
    where: { id: existingRun.id },
    data: {
      status: "failed",
      currentStep: null,
      errorMessage: `Marked stale after ${Math.round(age / 60_000)} minutes without heartbeat`,
      finishedAt: new Date(),
    },
  });
  return null;
}

/**
 * One serverless-friendly unit of work for the weekly pipeline.
 * Cron should invoke this repeatedly (staggered schedules and/or self-chain).
 */
export async function runPipelineTick(
  week?: string,
  options: { publishLatest?: boolean } = {}
) {
  const w = week ?? getCurrentWeek();
  let run = await failStaleRunning(w);

  if (run && run.status === "running") {
    // continue existing
  } else {
    run = await prisma.pipelineRun.create({
      data: {
        week: w,
        status: "running",
        currentStep: collectStepFor(COLLECTION_ENGINES[0]!),
      },
    });
    logPipelineEvent({ event: "run_started", week: w, runId: run.id, mode: "tick" });
  }

  const step = run.currentStep ?? collectStepFor(COLLECTION_ENGINES[0]!);
  logPipelineEvent({
    event: "tick_started",
    week: w,
    runId: run.id,
    stage: step,
  });

  try {
    await touchRun(run.id, { currentStep: step });

    const collectEngineName = parseCollectEngine(step);
    if (collectEngineName) {
      const deadline = Date.now() + PIPELINE_COLLECTION_TIMEOUT_MS;
      const batch = await runStage(`collecting:${collectEngineName}`, collectEngine(w, collectEngineName, deadline), PIPELINE_COLLECTION_TIMEOUT_MS);
      const collectedCount = await prisma.response.count({
        where: { week: w, status: "ok" },
      });
      const next = nextStepAfterCollect(collectEngineName);
      await touchRun(run.id, { collectedCount, currentStep: next });
      logPipelineEvent({
        event: "tick_completed",
        week: w,
        runId: run.id,
        stage: step,
        attemptedCount: batch.length,
        nextStep: next,
      });
      return {
        runId: run.id,
        week: w,
        status: "continue" as const,
        step,
        nextStep: next,
        done: false,
      };
    }

    if (step === "extracting") {
      const mentionCount = await runStage("extracting", extractWeek(w));
      await touchRun(run.id, { extractedCount: mentionCount, currentStep: "normalizing" });
      return tickContinue(run.id, w, step, "normalizing");
    }

    if (step === "normalizing") {
      const resolved = await runStage("normalizing", normalizeWeek(w));
      await touchRun(run.id, { resolvedCount: resolved, currentStep: "consolidating" });
      return tickContinue(run.id, w, step, "consolidating");
    }

    if (step === "consolidating") {
      await runStage("consolidating", consolidateBrands());
      await touchRun(run.id, { currentStep: "classifying" });
      return tickContinue(run.id, w, step, "classifying");
    }

    if (step === "classifying") {
      const classified = await runStage("classifying", classifyAllBrands());
      await touchRun(run.id, { classifiedCount: classified, currentStep: "scoring" });
      return tickContinue(run.id, w, step, "scoring");
    }

    if (step === "scoring") {
      await runStage("scoring", scoreAll(w));
      const snapshotCount = await prisma.snapshot.count({ where: { week: w } });
      await touchRun(run.id, { snapshotCount, currentStep: "publishing" });
      return tickContinue(run.id, w, step, "publishing");
    }

    if (step === "publishing") {
      const publication = await runStage("publishing", publishLeaderboards(w, {
        updateLatest: options.publishLatest,
      }));
      if (publication.publishStatus === "success" && (options.publishLatest ?? true)) {
        await runStage("public_smoke_check", verifyPublicCategoryPage(w));
      }
      const snapshotCount = await prisma.snapshot.count({ where: { week: w } });
      await prisma.pipelineRun.update({
        where: { id: run.id },
        data: {
          status: "success",
          currentStep: null,
          snapshotCount,
          manifestUrl: publication.manifestUrl,
          latestManifestUrl: publication.latestManifestUrl,
          publishStatus: publication.publishStatus,
          publishError: publication.publishError?.slice(0, 4000) ?? null,
          publishedAt: new Date(publication.publishedAt),
          finishedAt: new Date(),
        },
      });
      logPipelineEvent({ event: "run_completed", week: w, runId: run.id, snapshotCount, mode: "tick" });
      return {
        runId: run.id,
        week: w,
        status: "success" as const,
        step,
        nextStep: null,
        done: true,
      };
    }

    throw new Error(`Unknown pipeline step: ${step}`);
  } catch (error) {
    const details = errorContext(error);
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        errorMessage: details.message.slice(0, 4000),
        finishedAt: new Date(),
      },
    });
    logPipelineEvent({ event: "run_failed", week: w, runId: run.id, error: details, mode: "tick" });
    throw error;
  }
}

function tickContinue(runId: string, week: string, step: string, nextStep: string) {
  logPipelineEvent({
    event: "tick_completed",
    week,
    runId,
    stage: step,
    nextStep,
  });
  return {
    runId,
    week,
    status: "continue" as const,
    step,
    nextStep,
    done: false as const,
  };
}

/** Local / manual full run (not for Vercel cron — too long for one invocation). */
export async function runFullPipeline(
  week?: string,
  options: { publishLatest?: boolean } = {}
) {
  const w = week ?? getCurrentWeek();
  const existing = await failStaleRunning(w);
  if (existing) {
    throw new Error(`Pipeline already running for ${w} (run ${existing.id})`);
  }

  const run = await prisma.pipelineRun.create({
    data: { week: w, status: "running", currentStep: collectStepFor(COLLECTION_ENGINES[0]!) },
  });
  logPipelineEvent({ event: "run_started", week: w, runId: run.id, mode: "full" });

  const timedStage = async <T>(stage: string, work: () => Promise<T>) => {
    const startedAt = Date.now();
    logPipelineEvent({ event: "stage_started", week: w, runId: run.id, stage });
    await touchRun(run.id, { currentStep: stage });
    const result = await runStage(stage, work());
    logPipelineEvent({
      event: "stage_completed",
      week: w,
      runId: run.id,
      stage,
      durationMs: Date.now() - startedAt,
    });
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
      const collectedCount = await prisma.response.count({
        where: { week: w, status: "ok" },
      });
      await touchRun(run.id, {
        collectedCount,
        currentStep: nextStepAfterCollect(engine),
      });
    }

    const collectedCount = await prisma.response.count({
      where: { week: w, status: "ok" },
    });
    await touchRun(run.id, { collectedCount, currentStep: "extracting" });
    logPipelineEvent({
      event: "collection_summary",
      week: w,
      runId: run.id,
      collectedCount,
      attemptedCount: collectResults.length,
    });

    const mentionCount = await timedStage("extracting", () => extractWeek(w));
    await touchRun(run.id, { extractedCount: mentionCount, currentStep: "normalizing" });

    const resolved = await timedStage("normalizing", () => normalizeWeek(w));
    await touchRun(run.id, { resolvedCount: resolved, currentStep: "consolidating" });

    await timedStage("consolidating", () => consolidateBrands());
    await touchRun(run.id, { currentStep: "classifying" });

    const classified = await timedStage("classifying", () => classifyAllBrands());
    await touchRun(run.id, { classifiedCount: classified, currentStep: "scoring" });

    await timedStage("scoring", () => scoreAll(w));
    const snapshotCount = await prisma.snapshot.count({ where: { week: w } });
    await touchRun(run.id, { snapshotCount, currentStep: "publishing" });

    const publication = await timedStage("publishing", () =>
      publishLeaderboards(w, { updateLatest: options.publishLatest })
    );
    if (publication.publishStatus === "skipped") {
      console.warn(
        "[7/7] Blob mirror skipped (PUBLISH_BLOB_MIRROR off or no credentials); DB snapshots remain published SoT"
      );
    } else if (publication.publishStatus === "failed_mirror") {
      console.warn(
        `[7/7] Blob mirror failed; DB snapshots remain published SoT: ${publication.publishError ?? "unknown"}`
      );
    }
    if (publication.publishStatus === "success" && (options.publishLatest ?? true)) {
      await timedStage("public_smoke_check", () => verifyPublicCategoryPage(w));
    }

    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: "success",
        currentStep: null,
        manifestUrl: publication.manifestUrl,
        latestManifestUrl: publication.latestManifestUrl,
        publishStatus: publication.publishStatus,
        publishError: publication.publishError?.slice(0, 4000) ?? null,
        publishedAt: new Date(publication.publishedAt),
        finishedAt: new Date(),
      },
    });
    logPipelineEvent({ event: "run_completed", week: w, runId: run.id, snapshotCount, mode: "full" });
    return { runId: run.id, week: w, status: "success" as const, done: true };
  } catch (error) {
    const details = errorContext(error);
    await prisma.pipelineRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        errorMessage: details.message.slice(0, 4000),
        finishedAt: new Date(),
      },
    });
    logPipelineEvent({ event: "run_failed", week: w, runId: run.id, error: details, mode: "full" });
    throw error;
  }
}
