import type { PutCommandOptions } from "@vercel/blob";

/** Vercel Blob: read-write token locally, or OIDC + store id on Vercel. */
export function canPublishToBlob() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  if (process.env.BLOB_STORE_ID && process.env.VERCEL) return true;
  return false;
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
