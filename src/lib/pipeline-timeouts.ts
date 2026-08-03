function readPositiveInt(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export const PIPELINE_REQUEST_TIMEOUT_MS = readPositiveInt(
  "PIPELINE_REQUEST_TIMEOUT_MS",
  45_000
);

export const PIPELINE_COLLECTION_TIMEOUT_MS = readPositiveInt(
  "PIPELINE_COLLECTION_TIMEOUT_MS",
  20 * 60_000
);

export const PIPELINE_EXTRACTION_TIMEOUT_MS = readPositiveInt(
  "PIPELINE_EXTRACTION_TIMEOUT_MS",
  20 * 60_000
);

export const PIPELINE_STAGE_TIMEOUT_MS = readPositiveInt(
  "PIPELINE_STAGE_TIMEOUT_MS",
  20 * 60_000
);

export const PIPELINE_RUN_STALE_TIMEOUT_MS = readPositiveInt(
  "PIPELINE_RUN_STALE_TIMEOUT_MS",
  30 * 60 * 60_000
);

export class PipelineTimeoutError extends Error {
  constructor(stage: string, timeoutMs: number) {
    super(`${stage} exceeded its ${Math.round(timeoutMs / 60_000)} minute timeout`);
    this.name = "PipelineTimeoutError";
  }
}

export function assertBeforeDeadline(stage: string, deadline: number, timeoutMs: number) {
  if (Date.now() >= deadline) {
    throw new PipelineTimeoutError(stage, timeoutMs);
  }
}
