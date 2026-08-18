import { NextRequest } from "next/server";
import { handleCronTick } from "@/lib/cron-tick";

/** One engine/stage tick — keep under typical Pro serverless limits. */
export const maxDuration = 300;

/**
 * Safety net for the Monday schedule.
 * Invoked daily by Vercel Cron (Hobby-safe) and hourly by GitHub Actions.
 *
 * Gates (see `cron-catchup-policy.ts`) — entry is one `pipeline_runs` row:
 * - success + snapshots → no-op
 * - active lease (<5m heartbeat) → no-op (do not fight a live chain)
 * - cold running (<90m) → resume tick + chain
 * - otherwise start/remount, until `CATCHUP_MAX_RUNS_PER_WEEK` opens the circuit
 * Full `getPipelineHealth()` runs after a tick reports `done`.
 */
export async function GET(req: NextRequest) {
  return handleCronTick(req, { skipWhenHealthy: true });
}
