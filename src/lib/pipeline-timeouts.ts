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

/**
 * Soft wall-clock budget for one serverless cron tick (route maxDuration = 300s).
 * Collection stops between categories when this elapses and keeps the same
 * `collecting:<engine>` step so the next tick/chain continues without failing
 * the whole run. Leave headroom under the platform kill for response + after().
 */
export const PIPELINE_TICK_BUDGET_MS = readPositiveInt(
  "PIPELINE_TICK_BUDGET_MS",
  240_000
);

/**
 * Minimum remaining tick budget before packing another post-stage
 * (extract → … → publish) in the same invocation. Avoids starting scoring
 * or publishing with a few seconds left and dying mid-write.
 */
export const PIPELINE_POST_STAGE_PACK_MIN_MS = readPositiveInt(
  "PIPELINE_POST_STAGE_PACK_MIN_MS",
  20_000
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
