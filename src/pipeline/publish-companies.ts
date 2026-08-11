import { put } from "@vercel/blob";
import { prisma } from "@/lib/db";
import { blobMirrorSkipReason, blobPutOptions } from "@/lib/blob-publish";
import type { BrandPageData } from "@/lib/brand-page";
import {
  buildCompanyPagesFromBrandPages,
  mergeCompanyIndex,
} from "@/lib/company-data";
import type { CompanyIndex, CompanyPageData } from "@/lib/company-page";
import { logPipelineEvent } from "@/lib/pipeline-observability";

async function verifyCompanyPublication(
  week: string,
  indexUrl: string,
  sampleUrl: string | null,
  expectedPageCount: number
) {
  const stamp = Date.now().toString();
  const indexResponse = await fetch(`${indexUrl}?verify=${stamp}`, { cache: "no-store" });
  if (!indexResponse.ok) {
    throw new Error(`companies/index.json verification returned ${indexResponse.status}`);
  }
  const index = (await indexResponse.json()) as CompanyIndex;
  if (!index || typeof index !== "object" || Array.isArray(index)) {
    throw new Error("companies/index.json verification failed: invalid payload");
  }
  const indexCount = Object.keys(index).length;
  if (indexCount === 0 && expectedPageCount > 0) {
    throw new Error("companies/index.json verification failed: empty index");
  }

  if (sampleUrl) {
    const pageResponse = await fetch(`${sampleUrl}?verify=${stamp}`, { cache: "no-store" });
    if (!pageResponse.ok) {
      throw new Error(`company week snapshot verification returned ${pageResponse.status}`);
    }
    const page = (await pageResponse.json()) as CompanyPageData;
    if (page.week !== week || !page.slug || !Array.isArray(page.products)) {
      throw new Error("company week snapshot verification failed: invalid payload");
    }
  }
}

/**
 * Publish company aggregation snapshots derived from brand pages.
 * Opt-in Blob mirror (`PUBLISH_BLOB_MIRROR=1`) — skip/failure does not block reads (DB SoT).
 * - companies/index.json: slug → { name } (includes never-ranked company entities)
 * - companies/{slug}/{week}.json: products × category facts only
 */
export async function publishCompanyPages(week: string, brandPages: BrandPageData[]) {
  const skipReason = blobMirrorSkipReason();
  if (skipReason) {
    console.log(`[publish] Blob company mirror skipped (${skipReason})`);
    logPipelineEvent({ event: "company_publish_skipped", week, reason: skipReason });
    return;
  }

  try {
    const { companyPages, companyIndex: fromProducts } = buildCompanyPagesFromBrandPages(
      brandPages,
      { week, updatedAt: new Date().toISOString().split("T")[0] }
    );

    const [companyEntities, parentBrands] = await Promise.all([
      prisma.brand.findMany({
        where: { entityType: "company" },
        select: { canonicalName: true },
      }),
      prisma.brand.findMany({
        where: { parentBrandId: { not: null } },
        select: { parentBrand: { select: { canonicalName: true } } },
      }),
    ]);

    const extras = [
      ...companyEntities.map((row) => ({ name: row.canonicalName })),
      ...parentBrands
        .map((row) => row.parentBrand?.canonicalName)
        .filter((name): name is string => Boolean(name))
        .map((name) => ({ name })),
    ];

    const companyIndex = mergeCompanyIndex(fromProducts, extras);

    const jsonPut = blobPutOptions("application/json; charset=utf-8", {
      allowOverwrite: true,
    });

    let sampleUrl: string | null = null;
    for (const page of companyPages) {
      const uploaded = await put(
        `companies/${page.slug}/${week}.json`,
        JSON.stringify(page),
        jsonPut
      );
      sampleUrl ??= uploaded.url;
    }

    const indexUpload = await put(
      "companies/index.json",
      JSON.stringify(companyIndex),
      jsonPut
    );

    await verifyCompanyPublication(week, indexUpload.url, sampleUrl, companyPages.length);

    logPipelineEvent({
      event: "company_pages_published",
      week,
      companyCount: companyPages.length,
      indexCount: Object.keys(companyIndex).length,
      verified: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logPipelineEvent({
      event: "company_publish_failed_mirror",
      week,
      error: message,
    });
  }
}
