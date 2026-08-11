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

/**
 * Age of last heartbeat (`pipeline_runs.updated_at`) before a `running` row is
 * treated as dead. Keep well under a Monday of wall-clock wait: serverless cron
 * often kills the process without writing `failed`, leaving a stuck `running`.
 * Default 90 minutes (was 30 hours).
 */
export const PIPELINE_RUN_STALE_TIMEOUT_MS = readPositiveInt(
  "PIPELINE_RUN_STALE_TIMEOUT_MS",
  90 * 60_000
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
