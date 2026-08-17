import { NextRequest } from "next/server";
import { handleCronTick } from "@/lib/cron-tick";

/** One engine/stage tick — keep under typical Pro serverless limits. */
export const maxDuration = 300;

/**
 * Hourly safety net for the Monday schedule.
 *
 * Gates (see `cron-catchup-policy.ts`):
 * - healthy → no-op
 * - active lease (<5m heartbeat) → no-op (do not fight a live chain)
 * - cold running (<90m) → resume tick + chain
 * - otherwise start/remount, until `CATCHUP_MAX_RUNS_PER_WEEK` opens the circuit
 */
export async function GET(req: NextRequest) {
  return handleCronTick(req, { skipWhenHealthy: true });
}
