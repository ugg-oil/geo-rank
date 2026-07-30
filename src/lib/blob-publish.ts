import type { PutCommandOptions } from "@vercel/blob";

/** Vercel Blob: read-write token locally, or OIDC + store id on Vercel. */
export function canPublishToBlob() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  if (process.env.BLOB_STORE_ID && process.env.VERCEL) return true;
  return false;
}

export function blobPutOptions(
  contentType: string
): PutCommandOptions {
  const options: PutCommandOptions = {
    access: "public",
    addRandomSuffix: false,
    contentType,
  };
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    options.token = process.env.BLOB_READ_WRITE_TOKEN;
  }
  return options;
}
