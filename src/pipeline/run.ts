import { COLLECTION_ENGINES, type Engine } from "@/lib/constants";
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
  PIPELINE_TICK_BUDGET_MS,
  PIPELINE_POST_STAGE_PACK_MIN_MS,
} from "@/lib/pipeline-timeouts";
import { errorContext, logPipelineEvent } from "@/lib/pipeline-observability";
import { verifyPublicCategoryPage } from "@/lib/pipeline-health";
import {
  completeEnginesMissingSnapshots,
  findFirstIncompleteEngine,
  findNextIncompleteEngine,
  hasSufficientCollectedForScoring,
  weekHasPublishedSnapshots,
  weekNeedsPipelineTick,
} from "@/lib/collection-progress";

function collectStepFor(engine: Engine) {
  return `collecting:${engine}` as const;
}

function parseCollectEngine(step: string | null | undefined): Engine | null {
  if (!step?.startsWith("collecting:")) return null;
  const engine = step.slice("collecting:".length);
  return COLLECTION_ENGINES.includes(engine as Engine) ? (engine as Engine) : null;
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

function createThrottledHeartbeat(runId: string) {
  let lastHeartbeatMs = 0;
  let inFlight: Promise<void> | null = null;
  return async () => {
    const now = Date.now();
    if (now - lastHeartbeatMs < 10_000) return;
    if (inFlight) return;
    lastHeartbeatMs = now;
    inFlight = touchRun(runId, {}).finally(() => {
      inFlight = null;
    });
    await inFlight;
  };
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

async function finishSkippedNoDueWeek(week: string, runId: string | null): Promise<TickResult> {
  if (runId) {
    await prisma.pipelineRun.update({
      where: { id: runId },
      data: {
        status: "success",
        currentStep: null,
        finishedAt: new Date(),
        publishStatus: "skipped",
        errorMessage: null,
      },
    });
  }
  logPipelineEvent({
    event: "pipeline_skipped_no_due_categories",
    week,
    runId: runId ?? undefined,
  });
  return {
    runId: runId ?? "skipped",
    week,
    status: "success",
    step: "skipped",
    nextStep: null,
    done: true,
  };
}

type TickRun = { id: string };

type TickResult =
  | {
      runId: string;
      week: string;
      status: "continue";
      step: string;
      nextStep: string;
      done: false;
    }
  | {
      runId: string;
      week: string;
      status: "success";
      step: string;
      nextStep: null;
      done: true;
    };

async function runOnePostStage(
  run: TickRun,
  w: string,
  step: string,
  options: { publishLatest?: boolean },
  tickDeadline: number,
  heartbeat: () => Promise<void>
): Promise<TickResult> {
  if (step === "extracting") {
    const extracted = await runStage(
      "extracting",
      extractWeek(w, {
        onProgress: heartbeat,
        deadline: tickDeadline - 10_000,
      })
    );
    const nextStep = extracted.remaining > 0 ? "extracting" : "normalizing";
    await touchRun(run.id, { extractedCount: extracted.mentionCount, currentStep: nextStep });
    return tickContinue(run.id, w, step, nextStep);
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
    const existingSnapshots = await prisma.snapshot.count({ where: { week: w } });
    await runStage(
      "scoring",
      scoreAll(w, { force: existingSnapshots > 0, onProgress: heartbeat })
    );
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
    const remainingEngine = await findNextIncompleteEngine(w);
    if (remainingEngine) {
      const nextStep = collectStepFor(remainingEngine);
      await prisma.pipelineRun.update({
        where: { id: run.id },
        data: {
          status: "running",
          currentStep: nextStep,
          snapshotCount,
          manifestUrl: publication.manifestUrl,
          latestManifestUrl: publication.latestManifestUrl,
          publishStatus: publication.publishStatus,
          publishError: publication.publishError?.slice(0, 4000) ?? null,
          publishedAt: new Date(publication.publishedAt),
          finishedAt: null,
        },
      });
      logPipelineEvent({
        event: "tail_collection_started",
        week: w,
        runId: run.id,
        snapshotCount,
        nextStep,
      });
      return tickContinue(run.id, w, step, nextStep);
    }

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
      done: true as const,
    };
  }

  throw new Error(`Unknown pipeline step: ${step}`);
}

/**
 * Run post-stages until the tick budget is too tight for another one.
 * First stage always runs; additional stages need PACK_MIN remaining.
 */
async function runPackedPostStages(
  run: TickRun,
  w: string,
  startStep: string,
  options: { publishLatest?: boolean },
  tickDeadline: number,
  heartbeat: () => Promise<void>
): Promise<TickResult> {
  let step = startStep;
  let packed = 0;
  while (true) {
    if (packed > 0 && Date.now() + PIPELINE_POST_STAGE_PACK_MIN_MS >= tickDeadline) {
      logPipelineEvent({
        event: "post_stages_pack_stopped",
        week: w,
        runId: run.id,
        stage: step,
        packedStages: packed,
        remainingMs: tickDeadline - Date.now(),
      });
      return {
        runId: run.id,
        week: w,
        status: "continue",
        step,
        nextStep: step,
        done: false,
      };
    }

    const result = await runOnePostStage(run, w, step, options, tickDeadline, heartbeat);
    packed++;
    if (result.done) return result;
    if (parseCollectEngine(result.nextStep)) return result;
    step = result.nextStep;
  }
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
  const needsWork = await weekNeedsPipelineTick(w);
  let run = await failStaleRunning(w);

  if (!needsWork) {
    if (run?.status === "running") {
      return finishSkippedNoDueWeek(w, run.id);
    }
    const latest =
      run ??
      (await prisma.pipelineRun.findFirst({
        where: { week: w },
        orderBy: { startedAt: "desc" },
        select: { id: true, status: true, currentStep: true },
      }));
    if (latest?.status === "success") {
      return {
        runId: latest.id,
        week: w,
        status: "success",
        step: latest.currentStep ?? "skipped",
        nextStep: null,
        done: true,
      };
    }
    if (latest?.status === "failed") {
      return finishSkippedNoDueWeek(w, latest.id);
    }
    return finishSkippedNoDueWeek(w, null);
  }

  if (run && run.status === "running") {
    // continue existing
  } else {
    // Fix 5: start from the first engine that still has incomplete prompts,
    // not always chatgpt. This avoids burning tick budget on empty scans when
    // the first N engines already have all OK responses.
    const firstEngine = await findFirstIncompleteEngine(w);
    run = await prisma.pipelineRun.create({
      data: {
        week: w,
        status: "running",
        currentStep: collectStepFor(firstEngine),
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

  const tickDeadline = Date.now() + PIPELINE_TICK_BUDGET_MS;
  const heartbeat = createThrottledHeartbeat(run.id);

  try {
    await touchRun(run.id, { currentStep: step });

    const collectEngineName = parseCollectEngine(step);
    if (collectEngineName) {
      // First publish: skip remaining engines until overall boards are live.
      // After that, finish one trailing engine then extract/score/publish again.
      const published = await weekHasPublishedSnapshots(w);
      const alreadySufficient = await hasSufficientCollectedForScoring(w);
      const missingEngineBoards =
        published && (await completeEnginesMissingSnapshots(w));
      if ((alreadySufficient && !published) || missingEngineBoards) {
        const collectedCount = await prisma.response.count({ where: { week: w, status: "ok" } });
        await touchRun(run.id, { collectedCount, currentStep: "extracting" });
        logPipelineEvent({
          event: "tick_completed",
          week: w,
          runId: run.id,
          stage: step,
          nextStep: "extracting",
          earlyAdvance: true,
          missingEngineBoards,
        });
        return runPackedPostStages(run, w, "extracting", options, tickDeadline, heartbeat);
      }

      // Soft budget under serverless maxDuration; unfinished engines stay on this step.
      const batch = await collectEngine(w, collectEngineName, tickDeadline, {
        softDeadline: true,
        onCategoryComplete: heartbeat,
        onPromptComplete: heartbeat,
      });
      const collectedCount = await prisma.response.count({
        where: { week: w, status: "ok" },
      });

      const sufficient = await hasSufficientCollectedForScoring(w);
      const nextIncomplete = await findNextIncompleteEngine(w);
      // Unpublished + 3 engines: first overall publish.
      // Published + this engine done: score that engine's board before collecting the next.
      const next =
        batch.engineComplete && (published || sufficient)
          ? "extracting"
          : batch.engineComplete
            ? (nextIncomplete ? collectStepFor(nextIncomplete) : "extracting")
            : collectStepFor(collectEngineName);

      await touchRun(run.id, { collectedCount, currentStep: next });
      logPipelineEvent({
        event: "tick_completed",
        week: w,
        runId: run.id,
        stage: step,
        attemptedCount: batch.results.length,
        categoriesAttempted: batch.categoriesAttempted,
        engineComplete: batch.engineComplete,
        nextStep: next,
      });

      const remainingMs = tickDeadline - Date.now();
      if (next === "extracting" && remainingMs >= PIPELINE_POST_STAGE_PACK_MIN_MS) {
        return runPackedPostStages(run, w, "extracting", options, tickDeadline, heartbeat);
      }

      return {
        runId: run.id,
        week: w,
        status: "continue" as const,
        step,
        nextStep: next,
        done: false,
      };
    }

    return runPackedPostStages(run, w, step, options, tickDeadline, heartbeat);
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
  const heartbeat = createThrottledHeartbeat(run.id);

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

  const collectOneEngine = async (engine: Engine) => {
    const batch = await timedStage(`collecting:${engine}`, () => {
      const deadline = Date.now() + PIPELINE_COLLECTION_TIMEOUT_MS;
      return collectEngine(w, engine, deadline).then((r) => r.results);
    });
    const collectedCount = await prisma.response.count({
      where: { week: w, status: "ok" },
    });
    await touchRun(run.id, {
      collectedCount,
      currentStep: nextStepAfterCollect(engine),
    });
    return batch;
  };

  const runPostStages = async (forceScore: boolean) => {
    const extracted = await timedStage("extracting", () =>
      extractWeek(w, { onProgress: heartbeat })
    );
    await touchRun(run.id, { extractedCount: extracted.mentionCount, currentStep: "normalizing" });

    const resolved = await timedStage("normalizing", () => normalizeWeek(w));
    await touchRun(run.id, { resolvedCount: resolved, currentStep: "consolidating" });

    await timedStage("consolidating", () => consolidateBrands());
    await touchRun(run.id, { currentStep: "classifying" });

    const classified = await timedStage("classifying", () => classifyAllBrands());
    await touchRun(run.id, { classifiedCount: classified, currentStep: "scoring" });

    await timedStage("scoring", () => scoreAll(w, { force: forceScore, onProgress: heartbeat }));
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
    return { publication, snapshotCount };
  };

  try {
    const collectResults: string[] = [];
    for (const engine of COLLECTION_ENGINES) {
      const published = await weekHasPublishedSnapshots(w);
      const sufficient = await hasSufficientCollectedForScoring(w);
      if (sufficient && !published) {
        logPipelineEvent({
          event: "stage_skipped",
          week: w,
          runId: run.id,
          stage: `collecting:${engine}`,
          reason: "threshold_met_first_publish",
        });
        break;
      }
      const batch = await collectOneEngine(engine);
      collectResults.push(...batch);
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

    let { publication, snapshotCount } = await runPostStages(false);

    let remainingEngine = await findNextIncompleteEngine(w);
    if (remainingEngine) {
      logPipelineEvent({
        event: "tail_collection_started",
        week: w,
        runId: run.id,
        nextStep: collectStepFor(remainingEngine),
      });
      while (remainingEngine) {
        collectResults.push(...(await collectOneEngine(remainingEngine)));
        const tail = await runPostStages(true);
        publication = tail.publication;
        snapshotCount = tail.snapshotCount;
        remainingEngine = await findNextIncompleteEngine(w);
      }
    }

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
