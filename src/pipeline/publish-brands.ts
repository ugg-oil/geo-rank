import { put } from "@vercel/blob";
import { buildBrandPages } from "@/lib/brand-page-build";
import { blobMirrorSkipReason, blobPutOptions } from "@/lib/blob-publish";
import { logPipelineEvent } from "@/lib/pipeline-observability";
import { publishCompanyPages } from "@/pipeline/publish-companies";

export { buildBrandPages } from "@/lib/brand-page-build";

/**
 * Publish brand page data to Blob (opt-in mirror via `PUBLISH_BLOB_MIRROR=1`).
 * Failure / skip does not block brand page reads (DB SoT).
 * - brands/index.json: slug → { name, parentCompany }
 * - brands/{slug}/{week}.json: full brand page data
 */
export async function publishBrandPages(week: string) {
  const skipReason = blobMirrorSkipReason();
  if (skipReason) {
    console.log(`[publish] Blob brand mirror skipped (${skipReason})`);
    logPipelineEvent({ event: "brand_publish_skipped", week, reason: skipReason });
    return;
  }

  try {
    const { brandPages, brandIndex } = await buildBrandPages(week);

    const jsonPut = blobPutOptions("application/json; charset=utf-8", {
      allowOverwrite: true,
    });

    for (const page of brandPages) {
      await put(
        `brands/${page.slug}/${week}.json`,
        JSON.stringify(page),
        jsonPut
      );
    }

    await put(
      "brands/index.json",
      JSON.stringify(brandIndex),
      jsonPut
    );

    logPipelineEvent({
      event: "brand_pages_published",
      week,
      brandCount: brandPages.length,
    });

    await publishCompanyPages(week, brandPages);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logPipelineEvent({
      event: "brand_publish_failed_mirror",
      week,
      error: message,
    });
  }
}
