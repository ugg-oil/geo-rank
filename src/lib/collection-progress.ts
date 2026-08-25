import {
  CATEGORIES,
  COLLECTION_ENGINES,
  MIN_SCORING_ENGINES_FOR_OVERALL,
  PROMPTS_PER_CATEGORY,
  type Engine,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import { getCategoryPeriodDays } from "@/lib/category-period";
import { shouldCollectCategoryInPeriod } from "@/lib/period";

type CollectionCoverage = {
  expectedCategories: string[];
  promptCounts: Map<string, number>;
  promptIdsByCategoryEngine: Map<string, Set<string>>;
};

async function loadCollectionCoverage(week: string): Promise<CollectionCoverage> {
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
  for (const prompt of activePrompts) {
    promptCounts.set(prompt.category, (promptCounts.get(prompt.category) ?? 0) + 1);
  }

  const promptIdsByCategoryEngine = new Map<string, Set<string>>();
  for (const response of okResponses) {
    const key = `${response.category}\0${response.engine}`;
    const promptIds = promptIdsByCategoryEngine.get(key) ?? new Set<string>();
    promptIds.add(response.promptId);
    promptIdsByCategoryEngine.set(key, promptIds);
  }

  return { expectedCategories, promptCounts, promptIdsByCategoryEngine };
}

function engineCompleteForAllDue(
  coverage: CollectionCoverage,
  engine: Engine
): boolean {
  if (coverage.expectedCategories.length === 0) return true;
  return coverage.expectedCategories.every((category) => {
    const expectedPrompts = coverage.promptCounts.get(category) ?? PROMPTS_PER_CATEGORY;
    const key = `${category}\0${engine}`;
    return (coverage.promptIdsByCategoryEngine.get(key)?.size ?? 0) >= expectedPrompts;
  });
}

/** True when every due category has ≥ MIN_SCORING_ENGINES_FOR_OVERALL complete engines. */
export async function hasSufficientCollectedForScoring(week: string) {
  const coverage = await loadCollectionCoverage(week);
  if (coverage.expectedCategories.length === 0) return false;

  for (const category of coverage.expectedCategories) {
    const expectedPrompts = coverage.promptCounts.get(category) ?? PROMPTS_PER_CATEGORY;
    const completeEngines = COLLECTION_ENGINES.filter((engine) => {
      const key = `${category}\0${engine}`;
      return (coverage.promptIdsByCategoryEngine.get(key)?.size ?? 0) >= expectedPrompts;
    });
    if (completeEngines.length < MIN_SCORING_ENGINES_FOR_OVERALL) return false;
  }
  return true;
}

export async function findNextIncompleteEngine(week: string): Promise<Engine | null> {
  const coverage = await loadCollectionCoverage(week);
  for (const engine of COLLECTION_ENGINES) {
    if (!engineCompleteForAllDue(coverage, engine)) return engine;
  }
  return null;
}

/** First engine still missing prompts; falls back to the first engine if all are complete. */
export async function findFirstIncompleteEngine(week: string): Promise<Engine> {
  return (await findNextIncompleteEngine(week)) ?? COLLECTION_ENGINES[0]!;
}

export async function weekHasPublishedSnapshots(week: string) {
  const count = await prisma.snapshot.count({ where: { week } });
  return count > 0;
}

/** True when an engine is fully collected but has no leaderboard snapshots yet. */
export async function completeEnginesMissingSnapshots(week: string) {
  const coverage = await loadCollectionCoverage(week);
  const rows = await prisma.snapshot.findMany({
    where: { week, engine: { not: null } },
    distinct: ["engine"],
    select: { engine: true },
  });
  const have = new Set(rows.map((row) => row.engine));
  return COLLECTION_ENGINES.some(
    (engine) => engineCompleteForAllDue(coverage, engine) && !have.has(engine)
  );
}

export async function weekNeedsRemainingCollection(week: string) {
  return (await findNextIncompleteEngine(week)) !== null;
}

/** Cheap catchup gate: any collection engine with zero OK responses. */
export async function weekHasIdleCollectionEngines(week: string) {
  const rows = await prisma.response.findMany({
    where: { week, status: "ok" },
    distinct: ["engine"],
    select: { engine: true },
  });
  const present = new Set(rows.map((row) => row.engine));
  return COLLECTION_ENGINES.some((engine) => !present.has(engine));
}
