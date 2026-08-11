import { prisma } from "@/lib/db";
import { getOpenRouter } from "@/lib/openrouter";
import { COLLECTION_ENGINES, ENGINE_MODEL_SLUGS, type Engine } from "@/lib/constants";
import { getCurrentWeek } from "@/lib/week";
import {
  assertBeforeDeadline,
  PIPELINE_COLLECTION_TIMEOUT_MS,
} from "@/lib/pipeline-timeouts";

const COLLECTION_CONCURRENCY = 4;

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

async function collectOne(job: CollectionJob, week: string) {
  const existing = await prisma.response.findFirst({
    where: { week, engine: job.engine, promptId: job.promptId },
    orderBy: { createdAt: "desc" },
  });

  if (existing?.status === "ok") return `skip ${job.engine} / ${job.promptId}`;

  try {
    const completion = await getOpenRouter().chat.completions.create({
      model: ENGINE_MODEL_SLUGS[job.engine],
      messages: [{ role: "user", content: job.promptText }],
      temperature: 0.7,
    });

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
   * Default false — cron still uses shouldCollectCategoryInPeriod.
   */
  forceCategories?: boolean;
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
      results[index] = await collectOne(jobs[index], w);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(COLLECTION_CONCURRENCY, jobs.length) }, () => worker())
  );
  return results;
}

export async function collectEngine(
  week: string,
  engine: Engine,
  deadline?: number,
  options: CollectOptions = {}
) {
  const { CATEGORIES } = await import("@/lib/constants");
  const { getCategoryPeriodDays } = await import("@/lib/category-period");
  const { shouldCollectCategoryInPeriod } = await import("@/lib/period");
  const categories = options.categories ?? CATEGORIES;
  const allResults: string[] = [];
  for (const category of categories) {
    if (
      !options.forceCategories &&
      !shouldCollectCategoryInPeriod(getCategoryPeriodDays(category), week)
    ) {
      continue;
    }
    if (deadline) assertBeforeDeadline("collection", deadline, PIPELINE_COLLECTION_TIMEOUT_MS);
    allResults.push(...(await collectCategory(category, week, deadline, engine, options)));
  }
  return allResults;
}

export async function collectAll(week?: string, options: CollectOptions = {}) {
  const w = week ?? getCurrentWeek();
  const allResults: string[] = [];
  for (const engine of COLLECTION_ENGINES) {
    const deadline = Date.now() + PIPELINE_COLLECTION_TIMEOUT_MS;
    allResults.push(...(await collectEngine(w, engine, deadline, options)));
  }
  return allResults;
}
