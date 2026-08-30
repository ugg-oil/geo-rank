import { prisma } from "@/lib/db";
import { getOpenRouter } from "@/lib/openrouter";
import {
  COLLECTION_ENGINES,
  ENGINE_MODEL_SLUGS,
  MAX_CATEGORY_ENGINE_RETRIES,
  type Engine,
} from "@/lib/constants";
import { getCurrentWeek } from "@/lib/week";
import {
  assertBeforeDeadline,
  PipelineTimeoutError,
  PIPELINE_COLLECTION_TIMEOUT_MS,
  PIPELINE_REQUEST_TIMEOUT_MS,
} from "@/lib/pipeline-timeouts";

function readConcurrency(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

/** Default 2. DeepSeek is 1–2 min/call, so run more in flight per tick. */
function collectionConcurrency(engine?: Engine) {
  if (engine === "deepseek") {
    return readConcurrency("PIPELINE_DEEPSEEK_CONCURRENCY", 4);
  }
  return readConcurrency("PIPELINE_COLLECTION_CONCURRENCY", 2);
}

/** DeepSeek successes already take ~60–120s; don't retry or a hung call becomes 3 minutes. */
function requestOptions(engine: Engine) {
  if (engine === "deepseek") {
    return { timeout: 120_000, maxRetries: 0 as const };
  }
  return { timeout: PIPELINE_REQUEST_TIMEOUT_MS, maxRetries: 1 as const };
}

function completionText(message: { content?: unknown } | undefined) {
  const content = message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return typeof part.text === "string" ? part.text : "";
        }
        return "";
      })
      .join("");
  }
  return "";
}

type CollectionJob = {
  category: string;
  engine: Engine;
  promptId: string;
  promptText: string;
};

async function collectOne(
  job: CollectionJob,
  week: string,
  onPromptComplete?: () => Promise<void> | void
) {
  const existing = await prisma.response.findFirst({
    where: { week, engine: job.engine, promptId: job.promptId },
    orderBy: { createdAt: "desc" },
  });

  if (existing?.status === "ok") return `skip ${job.engine} / ${job.promptId}`;

  // Fix 4: cap retries on structurally-failing prompts (e.g. content policy
  // refusals) so they don't block engineComplete indefinitely.
  if (existing?.status === "failed") {
    const failCount = await prisma.response.count({
      where: { week, engine: job.engine, promptId: job.promptId, status: "failed" },
    });
    if (failCount >= MAX_CATEGORY_ENGINE_RETRIES) {
      return `skip-maxretry ${job.engine} / ${job.promptId}`;
    }
  }

  try {
    const completion = await getOpenRouter().chat.completions.create(
      {
        model: ENGINE_MODEL_SLUGS[job.engine],
        messages: [{ role: "user", content: job.promptText }],
        temperature: 0.7,
      },
      requestOptions(job.engine)
    );

    const rawText = completionText(completion.choices[0]?.message);
    const tokenCost =
      ((completion.usage?.prompt_tokens ?? 0) +
        (completion.usage?.completion_tokens ?? 0)) *
      0.00001;
    const data = {
      week,
      category: job.category,
      engine: job.engine,
      modelSlug: ENGINE_MODEL_SLUGS[job.engine],
      promptId: job.promptId,
      rawText,
      status: rawText.trim() ? "ok" : "failed",
      tokenCost,
    } as const;

    if (existing) {
      await prisma.response.update({ where: { id: existing.id }, data });
    } else {
      await prisma.response.create({ data });
    }

    await onPromptComplete?.();
    return `${rawText.trim() ? "✓" : "✗"} ${job.engine} / ${job.promptId}`;
  } catch (error) {
    const data = {
      week,
      category: job.category,
      engine: job.engine,
      modelSlug: ENGINE_MODEL_SLUGS[job.engine],
      promptId: job.promptId,
      rawText: null,
      status: "failed",
      tokenCost: null,
    } as const;

    if (existing) {
      await prisma.response.update({ where: { id: existing.id }, data });
    } else {
      await prisma.response.create({ data });
    }
    console.error(`Collection failed for ${job.engine} / ${job.promptId}:`, error);

    await onPromptComplete?.();
    return `✗ ${job.engine} / ${job.promptId}`;
  }
}

export type CollectOptions = {
  /** Appended to each seed prompt (P5 backfill: ` as of YYYY-MM-DD`). */
  promptSuffix?: string;
  /** Limit collection to these categories (default: all CATEGORIES). */
  categories?: readonly string[];
  /**
   * When true, skip period-cadence gating (explicit category backfill for a period key).
   * Default false — cron uses last-published + category period days.
   */
  forceCategories?: boolean;
  /** Soft stop: return instead of throwing when the tick budget is spent. */
  softDeadline?: boolean;
  /** Heartbeat after each category (serverless stale detection). */
  onCategoryComplete?: (category: string) => Promise<void> | void;
  /** Heartbeat after each prompt (serverless stale detection). */
  onPromptComplete?: () => Promise<void> | void;
};

export type CollectEngineResult = {
  results: string[];
  /** False when soft deadline stopped before all due categories finished. */
  engineComplete: boolean;
  categoriesAttempted: string[];
};

export async function collectCategory(
  category: string,
  week?: string,
  deadline?: number,
  onlyEngine?: Engine,
  options: CollectOptions = {}
) {
  const w = week ?? getCurrentWeek();
  const prompts = await prisma.prompt.findMany({
    where: { category, active: true },
  });
  const engines = onlyEngine ? [onlyEngine] : [...COLLECTION_ENGINES];
  const suffix = options.promptSuffix ?? "";
  const jobs: CollectionJob[] = engines.flatMap((engine) =>
    prompts.map((prompt) => ({
      category,
      engine,
      promptId: prompt.id,
      promptText: `${prompt.promptText}${suffix}`,
    }))
  );
  const results: string[] = [];
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= jobs.length) return;
      if (deadline) {
        assertBeforeDeadline("collection", deadline, PIPELINE_COLLECTION_TIMEOUT_MS);
      }
      results[index] = await collectOne(jobs[index], w, options.onPromptComplete);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(collectionConcurrency(onlyEngine), jobs.length) },
      () => worker()
    )
  );
  return results;
}

async function runCollectionJobs(
  jobs: CollectionJob[],
  week: string,
  engine: Engine,
  deadline: number | undefined,
  options: CollectOptions
) {
  const results: string[] = [];
  let cursor = 0;
  let stoppedEarly = false;
  const soft = options.softDeadline === true;

  async function worker() {
    while (true) {
      if (deadline && Date.now() >= deadline) {
        if (soft) {
          stoppedEarly = true;
          return;
        }
        assertBeforeDeadline("collection", deadline, PIPELINE_COLLECTION_TIMEOUT_MS);
      }
      const index = cursor++;
      if (index >= jobs.length) return;
      results[index] = await collectOne(jobs[index]!, week, options.onPromptComplete);
    }
  }

  if (jobs.length === 0) return { results, stoppedEarly: false };
  await Promise.all(
    Array.from({ length: Math.min(collectionConcurrency(engine), jobs.length) }, () =>
      worker()
    )
  );
  return { results, stoppedEarly };
}

export async function collectEngine(
  week: string,
  engine: Engine,
  deadline?: number,
  options: CollectOptions = {}
): Promise<CollectEngineResult> {
  const { CATEGORIES } = await import("@/lib/constants");
  const { getCategoryPeriodDays } = await import("@/lib/category-period");
  const { shouldCollectCategoryInPeriod } = await import("@/lib/period");
  const { mapLatestPublishedPeriods } = await import("@/lib/period-sequence");
  const categories = options.categories ?? CATEGORIES;
  const suffix = options.promptSuffix ?? "";
  const jobs: CollectionJob[] = [];
  const categoriesAttempted: string[] = [];
  const soft = options.softDeadline === true;
  const latestByCategory = options.forceCategories
    ? null
    : await mapLatestPublishedPeriods(categories);

  for (const category of categories) {
    if (
      !options.forceCategories &&
      !shouldCollectCategoryInPeriod(
        getCategoryPeriodDays(category),
        week,
        latestByCategory!.get(category) ?? null
      )
    ) {
      continue;
    }
    categoriesAttempted.push(category);
    const prompts = await prisma.prompt.findMany({
      where: { category, active: true },
    });
    for (const prompt of prompts) {
      jobs.push({
        category,
        engine,
        promptId: prompt.id,
        promptText: `${prompt.promptText}${suffix}`,
      });
    }
  }

  if (deadline && Date.now() >= deadline) {
    if (soft) {
      return { results: [], engineComplete: false, categoriesAttempted };
    }
    assertBeforeDeadline("collection", deadline, PIPELINE_COLLECTION_TIMEOUT_MS);
  }

  try {
    const { results, stoppedEarly } = await runCollectionJobs(
      jobs,
      week,
      engine,
      deadline,
      options
    );
    const attempted = new Set(
      jobs.filter((_, index) => results[index] !== undefined).map((job) => job.category)
    );
    for (const category of attempted) {
      await options.onCategoryComplete?.(category);
    }
    return {
      results,
      engineComplete: !stoppedEarly && jobs.every((_, index) => results[index] !== undefined),
      categoriesAttempted,
    };
  } catch (error) {
    if (soft && error instanceof PipelineTimeoutError) {
      return { results: [], engineComplete: false, categoriesAttempted };
    }
    throw error;
  }
}

export async function collectAll(week?: string, options: CollectOptions = {}) {
  const w = week ?? getCurrentWeek();
  const allResults: string[] = [];
  for (const engine of COLLECTION_ENGINES) {
    const deadline = Date.now() + PIPELINE_COLLECTION_TIMEOUT_MS;
    const batch = await collectEngine(w, engine, deadline, options);
    allResults.push(...batch.results);
  }
  return allResults;
}
