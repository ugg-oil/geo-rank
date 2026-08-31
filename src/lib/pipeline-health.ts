import { CATEGORY_TO_SLUG } from "@/lib/categories";
import { getCategoryPeriodDays } from "@/lib/category-period";
import {
  CATEGORIES,
  COLLECTION_ENGINES,
  MIN_SCORING_ENGINES_FOR_OVERALL,
  PROMPTS_PER_CATEGORY,
  TOP_N,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import { shouldCollectCategoryInPeriod } from "@/lib/period";
import { mapLatestPublishedPeriods } from "@/lib/period-sequence";
import { getSiteUrl } from "@/lib/seo";

type ManifestLike = { week?: string; boards?: Record<string, string> };

export function assessPublishedManifest(
  manifest: ManifestLike,
  week: string,
  options: { requireAllBoards?: boolean; requiredSlugs?: string[] } = {}
) {
  if (manifest.week !== week) return { ok: false as const, reason: `manifest week is ${manifest.week ?? "missing"}` };
  const boards = manifest.boards ?? {};
  if (Object.keys(boards).length === 0) {
    return { ok: false as const, reason: "manifest has no boards" };
  }
  if (options.requireAllBoards !== false) {
    const required = options.requiredSlugs ?? Object.values(CATEGORY_TO_SLUG);
    const missingBoards = required.filter((slug) => !boards[slug]);
    if (missingBoards.length) return { ok: false as const, reason: `missing boards: ${missingBoards.join(", ")}` };
  }
  return { ok: true as const };
}

export type PublishMirrorStatus = "success" | "skipped" | "failed_mirror";

export type PublicationResult = {
  manifestUrl: string | null;
  latestManifestUrl: string | null;
  publishedAt: string;
  publishStatus: PublishMirrorStatus;
  publishError?: string | null;
};

export async function recordPublication(week: string, publication: PublicationResult) {
  const run = await prisma.pipelineRun.findFirst({ where: { week, status: "success" }, orderBy: { finishedAt: "desc" }, select: { id: true } });
  if (!run) return null;
  return prisma.pipelineRun.update({ where: { id: run.id }, data: {
    manifestUrl: publication.manifestUrl,
    latestManifestUrl: publication.latestManifestUrl,
    publishStatus: publication.publishStatus,
    publishError: publication.publishError?.slice(0, 4000) ?? null,
    publishedAt: new Date(publication.publishedAt),
  }});
}

export async function recordPublicationFailure(week: string, error: string) {
  const run = await prisma.pipelineRun.findFirst({ where: { week, status: "success" }, orderBy: { finishedAt: "desc" }, select: { id: true } });
  if (!run) return null;
  return prisma.pipelineRun.update({ where: { id: run.id }, data: { publishStatus: "failed", publishError: error.slice(0, 4000) } });
}

/**
 * Health = current-period publish readiness for catch-up / monitoring.
 * Requires successful run, non-zero snapshots, overall Top20 for every
 * category due this period, and ≥ MIN_SCORING_ENGINES complete engines each.
 * Blob manifests remain optional warnings only.
 */
export async function getPipelineHealth(week: string) {
  const latestByCategory = await mapLatestPublishedPeriods(CATEGORIES);
  const expectedCategories = CATEGORIES.filter((category) =>
    shouldCollectCategoryInPeriod(
      getCategoryPeriodDays(category),
      week,
      latestByCategory.get(category) ?? null
    )
  );
  const run = await prisma.pipelineRun.findFirst({ where: { week }, orderBy: { startedAt: "desc" }, select: {
    id: true, status: true, currentStep: true, startedAt: true, updatedAt: true, finishedAt: true, snapshotCount: true,
    manifestUrl: true, latestManifestUrl: true, publishStatus: true, publishedAt: true, publishError: true, errorMessage: true,
  }});
  if (expectedCategories.length === 0) {
    return {
      ok: true as const,
      week,
      reason: "no_categories_due",
      run,
      warnings: [],
    };
  }
  if (!run) return { ok: false as const, week, reason: "no pipeline run found", run: null };
  const weekSnapshotCount = await prisma.snapshot.count({ where: { week } });
  if (run.status !== "success") {
    if (!(run.status === "running" && weekSnapshotCount > 0)) {
      return { ok: false as const, week, reason: `run status is ${run.status}`, run };
    }
  } else if (weekSnapshotCount <= 0 && (!run.snapshotCount || run.snapshotCount <= 0)) {
    return { ok: false as const, week, reason: "snapshot count is zero", run };
  }

  const [activePrompts, okResponses, overallBoards] = await Promise.all([
    prisma.prompt.findMany({
      where: { category: { in: [...expectedCategories] }, active: true },
      select: { id: true, category: true },
    }),
    prisma.response.findMany({
      where: {
        week,
        category: { in: [...expectedCategories] },
        engine: { in: [...COLLECTION_ENGINES] },
        status: "ok",
      },
      select: { category: true, engine: true, promptId: true },
    }),
    prisma.snapshot.findMany({
      where: {
        week,
        category: { in: [...expectedCategories] },
        engine: null,
        rank: { lte: TOP_N },
      },
      select: { category: true },
      distinct: ["category"],
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
  const publishedCategories = new Set(overallBoards.map((row) => row.category));
  const missingBoards = expectedCategories.filter((category) => !publishedCategories.has(category));
  const undercoveredCategories = expectedCategories.flatMap((category) => {
    const expectedPrompts = promptCounts.get(category) ?? PROMPTS_PER_CATEGORY;
    const completeEngines = COLLECTION_ENGINES.filter(
      (engine) =>
        (promptIdsByCategoryEngine.get(`${category}\0${engine}`)?.size ?? 0) >= expectedPrompts
    );
    return completeEngines.length >= MIN_SCORING_ENGINES_FOR_OVERALL
      ? []
      : [{ category, completeEngines: completeEngines.length, expectedPrompts }];
  });

  if (missingBoards.length > 0 || undercoveredCategories.length > 0) {
    return {
      ok: false as const,
      week,
      reason: "published coverage is incomplete",
      run,
      coverage: {
        expectedCategories: expectedCategories.length,
        missingBoards,
        undercoveredCategories,
      },
    };
  }

  const warnings: string[] = [];
  if (run.status === "running") {
    warnings.push("tail_collection_in_progress");
  }
  if (!run.manifestUrl || !run.latestManifestUrl) {
    warnings.push("blob_mirror_missing");
  }
  if (run.publishStatus === "failed_mirror" || run.publishStatus === "failed") {
    warnings.push(`publish_status_${run.publishStatus}`);
  }

  return {
    ok: true as const,
    week,
    run,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}

/** Verifies the public rendering path after boards are readable (DB or Blob). */
export async function verifyPublicCategoryPage(week: string) {
  if (process.env.PIPELINE_PUBLIC_SMOKE_CHECK === "0") return;
  // A local CLI does not normally have a running Next server; production always has VERCEL.
  if (!process.env.VERCEL) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${getSiteUrl()}/category/ai-tools`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Public category check returned ${response.status}`);
    if (!(await response.text()).includes(week)) {
      throw new Error(`Public category check did not render ${week}`);
    }
  } finally {
    clearTimeout(timer);
  }
}
