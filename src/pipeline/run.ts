import {
  CATEGORIES,
  COLLECTION_ENGINES,
  MIN_SCORING_ENGINES_FOR_OVERALL,
  PROMPTS_PER_CATEGORY,
  type Engine,
} from "@/lib/constants";
import { collectEngine } from "./collect";
import { extractWeek } from "./extract";
import { normalizeWeek } from "./normalize";
import { consolidateBrands } from "./consolidate";
import { classifyAllBrands } from "./classify-entities";
import { scoreAll } from "./score";
import { publishLeaderboards } from "./publish";
import { getCurrentWeek } from "@/lib/week";
import { prisma } from "@/lib/db";
import { getCategoryPeriodDays } from "@/lib/category-period";
import { shouldCollectCategoryInPeriod } from "@/lib/period";
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

/**
 * Returns true when every due category already has >= MIN_SCORING_ENGINES_FOR_OVERALL
 * engines whose OK response count covers all active prompts for that category.
 * Used to skip slow trailing engines (e.g. DeepSeek) and advance to extract/score.
 */
async function hasSufficientCollectedForScoring(week: string) {
  const expectedCategories = CATEGORIES.filter((category) =>
    shouldCollectCategoryInPeriod(getCategoryPeriodDays(category), week)
  );
  if (expectedCategories.length === 0) return false;

  const [activePrompts, okResponses] = await Promise.all([
    prisma.prompt.findMany({
      where: { category: { in: expectedCategories }, active: true },
      select: { id: true, category: true },
    }),
    prisma.response.findMany({
      where: {
        week,
        category: { in: expectedCategories },
        engine: { in: [...COLLECTION_ENGINES] },
        status: "ok",
      },
      select: { category: true, engine: true, promptId: true },
    }),
  ]);

  const promptCounts = new Map<string, number>();
  for (const p of activePrompts) {
    promptCounts.set(p.category, (promptCounts.get(p.category) ?? 0) + 1);
  }

  const promptIdsByCategoryEngine = new Map<string, Set<string>>();
  for (const r of okResponses) {
    const key = `${r.category}\0${r.engine}`;
    const set = promptIdsByCategoryEngine.get(key) ?? new Set<string>();
    set.add(r.promptId);
    promptIdsByCategoryEngine.set(key, set);
  }

  for (const category of expectedCategories) {
    const expectedPrompts = promptCounts.get(category) ?? PROMPTS_PER_CATEGORY;
    const completeEngines = COLLECTION_ENGINES.filter((engine) => {
      const key = `${category}\0${engine}`;
      return (promptIdsByCategoryEngine.get(key)?.size ?? 0) >= expectedPrompts;
    });
    if (completeEngines.length < MIN_SCORING_ENGINES_FOR_OVERALL) return false;
  }

  return true;
}

/**
 * Fix 5: when a stale run is killed and a new one created, start from the
 * first engine that hasn't yet collected all prompts for every due category,
 * rather than always restarting from the first engine.
 * Falls back to the first engine when everything is already complete
 * (shouldn't happen in practice, but safe).
 */
async function findFirstIncompleteEngine(week: string): Promise<Engine> {
  const expectedCategories = CATEGORIES.filter((category) =>
    shouldCollectCategoryInPeriod(getCategoryPeriodDays(category), week)
  );

  const [activePrompts, okResponses] = await Promise.all([
    prisma.prompt.findMany({
      where: { category: { in: expectedCategories }, active: true },
      select: { id: true, category: true },
    }),
    prisma.response.findMany({
      where: {
        week,
        category: { in: expectedCategories },
        engine: { in: [...COLLECTION_ENGINES] },
        status: "ok",
      },
      select: { category: true, engine: true, promptId: true },
    }),
  ]);

  const promptCounts = new Map<string, number>();
  for (const p of activePrompts) {
    promptCounts.set(p.category, (promptCounts.get(p.category) ?? 0) + 1);
  }

  const promptIdsByCategoryEngine = new Map<string, Set<string>>();
  for (const r of okResponses) {
    const key = `${r.category}\0${r.engine}`;
    const set = promptIdsByCategoryEngine.get(key) ?? new Set<string>();
    set.add(r.promptId);
    promptIdsByCategoryEngine.set(key, set);
  }

  for (const engine of COLLECTION_ENGINES) {
    const engineComplete = expectedCategories.every((category) => {
      const expectedPrompts = promptCounts.get(category) ?? PROMPTS_PER_CATEGORY;
      const key = `${category}\0${engine}`;
      return (promptIdsByCategoryEngine.get(key)?.size ?? 0) >= expectedPrompts;
    });
    if (!engineComplete) return engine;
  }

  return COLLECTION_ENGINES[0]!;
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
  heartbeat: () => Promise<void>
): Promise<TickResult> {
  if (step === "extracting") {
    const mentionCount = await runStage("extracting", extractWeek(w, { onProgress: heartbeat }));
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
    await runStage("scoring", scoreAll(w, { onProgress: heartbeat }));
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

    const result = await runOnePostStage(run, w, step, options, heartbeat);
    packed++;
    if (result.done) return result;
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
  let run = await failStaleRunning(w);

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
      // Fix 1: check the scoring threshold BEFORE doing any collection work.
      // If we already have enough complete engines for every due category,
      // skip the rest of collection and advance to extracting immediately.
      // This prevents slow trailing engines (DeepSeek) from blocking the
      // entire pipeline when the threshold is already satisfied.
      const alreadySufficient = await hasSufficientCollectedForScoring(w);
      if (alreadySufficient) {
        const collectedCount = await prisma.response.count({ where: { week: w, status: "ok" } });
        await touchRun(run.id, { collectedCount, currentStep: "extracting" });
        logPipelineEvent({
          event: "tick_completed",
          week: w,
          runId: run.id,
          stage: step,
          nextStep: "extracting",
          earlyAdvance: true,
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

      // Re-check after this engine's tick: maybe it pushed us over the threshold.
      const shouldAdvance = await hasSufficientCollectedForScoring(w);
      const next = shouldAdvance
        ? "extracting"
        : batch.engineComplete
          ? nextStepAfterCollect(collectEngineName)
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

  try {
    const collectResults: string[] = [];
    for (const engine of COLLECTION_ENGINES) {
      // Fix 6: same early-advance logic as tick mode — skip slow trailing
      // engines once scoring threshold is already met.
      const sufficient = await hasSufficientCollectedForScoring(w);
      if (sufficient) {
        logPipelineEvent({ event: "stage_skipped", week: w, runId: run.id, stage: `collecting:${engine}`, reason: "threshold_met" });
        break;
      }

      const batch = await timedStage(`collecting:${engine}`, () => {
        const deadline = Date.now() + PIPELINE_COLLECTION_TIMEOUT_MS;
        return collectEngine(w, engine, deadline).then((r) => r.results);
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

    const mentionCount = await timedStage("extracting", () =>
      extractWeek(w, { onProgress: heartbeat })
    );
    await touchRun(run.id, { extractedCount: mentionCount, currentStep: "normalizing" });

    const resolved = await timedStage("normalizing", () => normalizeWeek(w));
    await touchRun(run.id, { resolvedCount: resolved, currentStep: "consolidating" });

    await timedStage("consolidating", () => consolidateBrands());
    await touchRun(run.id, { currentStep: "classifying" });

    const classified = await timedStage("classifying", () => classifyAllBrands());
    await touchRun(run.id, { classifiedCount: classified, currentStep: "scoring" });

    await timedStage("scoring", () => scoreAll(w, { onProgress: heartbeat }));
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
