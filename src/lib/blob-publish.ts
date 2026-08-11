import type { PutCommandOptions } from "@vercel/blob";

/**
 * Opt-in Blob mirror writes. Default off (B3) so publish does not burn
 * Advanced Ops / fail when the store is blocked. Set `PUBLISH_BLOB_MIRROR=1`
 * to enable; R2 is not implemented (future mirror only, never SoT).
 */
export function isBlobMirrorEnabled(): boolean {
  return process.env.PUBLISH_BLOB_MIRROR === "1";
}

/** Vercel Blob write credentials: token locally, or OIDC + store id on Vercel. */
export function hasBlobWriteCredentials(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  if (process.env.BLOB_STORE_ID && process.env.VERCEL) return true;
  return false;
}

export type BlobMirrorSkipReason = "mirror_disabled" | "missing_credentials";

/** Why Blob put should be skipped, or null when mirror may proceed. */
export function blobMirrorSkipReason(): BlobMirrorSkipReason | null {
  if (!isBlobMirrorEnabled()) return "mirror_disabled";
  if (!hasBlobWriteCredentials()) return "missing_credentials";
  return null;
}

/** True only when `PUBLISH_BLOB_MIRROR=1` and write credentials exist. */
export function canPublishToBlob(): boolean {
  return blobMirrorSkipReason() === null;
}

export function blobPutOptions(
  contentType: string,
  options?: { allowOverwrite?: boolean; cacheControlMaxAge?: number }
): PutCommandOptions {
  const putOptions: PutCommandOptions = {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: options?.allowOverwrite ?? false,
    contentType,
  };
  if (options?.cacheControlMaxAge !== undefined) {
    putOptions.cacheControlMaxAge = options.cacheControlMaxAge;
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    putOptions.token = process.env.BLOB_READ_WRITE_TOKEN;
  }
  return putOptions;
}
