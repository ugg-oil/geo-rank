import { CATEGORY_TO_SLUG } from "@/lib/categories";
import { prisma } from "@/lib/db";
import { getSiteUrl } from "@/lib/seo";

type ManifestLike = { week?: string; boards?: Record<string, string> };

export function assessPublishedManifest(manifest: ManifestLike, week: string) {
  if (manifest.week !== week) return { ok: false as const, reason: `manifest week is ${manifest.week ?? "missing"}` };
  const missingBoards = Object.values(CATEGORY_TO_SLUG).filter((slug) => !manifest.boards?.[slug]);
  if (missingBoards.length) return { ok: false as const, reason: `missing boards: ${missingBoards.join(", ")}` };
  return { ok: true as const };
}

export type PublicationResult = { manifestUrl: string; latestManifestUrl: string; publishedAt: string };

export async function recordPublication(week: string, publication: PublicationResult) {
  const run = await prisma.pipelineRun.findFirst({ where: { week, status: "success" }, orderBy: { finishedAt: "desc" }, select: { id: true } });
  if (!run) return null;
  return prisma.pipelineRun.update({ where: { id: run.id }, data: {
    manifestUrl: publication.manifestUrl, latestManifestUrl: publication.latestManifestUrl,
    publishStatus: "success", publishError: null, publishedAt: new Date(publication.publishedAt),
  }});
}

export async function recordPublicationFailure(week: string, error: string) {
  const run = await prisma.pipelineRun.findFirst({ where: { week, status: "success" }, orderBy: { finishedAt: "desc" }, select: { id: true } });
  if (!run) return null;
  return prisma.pipelineRun.update({ where: { id: run.id }, data: { publishStatus: "failed", publishError: error.slice(0, 4000) } });
}

export async function getPipelineHealth(week: string) {
  const run = await prisma.pipelineRun.findFirst({ where: { week }, orderBy: { startedAt: "desc" }, select: {
    id: true, status: true, currentStep: true, startedAt: true, finishedAt: true, snapshotCount: true,
    manifestUrl: true, latestManifestUrl: true, publishStatus: true, publishedAt: true, publishError: true, errorMessage: true,
  }});
  if (!run) return { ok: false as const, week, reason: "no pipeline run found", run: null };
  if (run.status !== "success") return { ok: false as const, week, reason: `run status is ${run.status}`, run };
  if (!run.snapshotCount || run.snapshotCount <= 0) return { ok: false as const, week, reason: "snapshot count is zero", run };
  if (run.publishStatus !== "success" || !run.manifestUrl || !run.latestManifestUrl) return { ok: false as const, week, reason: "published manifest is not confirmed", run };
  return { ok: true as const, week, run };
}

/** Verifies the public rendering path after Blob manifests have been published. */
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
