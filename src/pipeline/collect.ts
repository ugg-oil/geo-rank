import { prisma } from "@/lib/db";
import { getOpenRouter } from "@/lib/openrouter";
import { ENGINES, ENGINE_MODEL_SLUGS, type Engine } from "@/lib/constants";
import { getCurrentWeek } from "@/lib/week";
import {
  assertBeforeDeadline,
  PIPELINE_COLLECTION_TIMEOUT_MS,
} from "@/lib/pipeline-timeouts";

const COLLECTION_CONCURRENCY = 4;

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

    const rawText = completion.choices[0]?.message?.content ?? "";
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

export async function collectCategory(
  category: string,
  week?: string,
  deadline?: number
) {
  const w = week ?? getCurrentWeek();
  const prompts = await prisma.prompt.findMany({
    where: { category, active: true },
  });
  const jobs: CollectionJob[] = ENGINES.flatMap((engine) =>
    prompts.map((prompt) => ({
      category,
      engine,
      promptId: prompt.id,
      promptText: prompt.promptText,
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

export async function collectAll(week?: string) {
  const { CATEGORIES } = await import("@/lib/constants");
  const w = week ?? getCurrentWeek();
  const deadline = Date.now() + PIPELINE_COLLECTION_TIMEOUT_MS;
  const allResults: string[] = [];
  for (const category of CATEGORIES) {
    assertBeforeDeadline("collection", deadline, PIPELINE_COLLECTION_TIMEOUT_MS);
    allResults.push(...(await collectCategory(category, w, deadline)));
  }
  return allResults;
}
