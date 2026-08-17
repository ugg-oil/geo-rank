import { prisma } from "@/lib/db";
import { PIPELINE_RUN_STALE_TIMEOUT_MS } from "@/lib/pipeline-timeouts";

/**
 * Catch-up policy for `/api/cron/catchup`.
 *
 * Design goals (one package, not one-off patches):
 * - Recover within ~1h after infra blips without waiting until next Monday.
 * - Never fight an actively chaining worker (short lease).
 * - Resume cold `running` rows instead of sitting until the 90m stale timeout.
 * - Cap remounts so structural gaps cannot burn API forever.
 * - Keep Monday `/api/cron` as the primary schedule (no circuit there).
 */

/** Self-chain ceiling. 6 engines + ~6 post stages needs headroom when `after()` holds. */
export const PIPELINE_CRON_MAX_CHAIN_DEPTH = 24;

/**
 * Heartbeat younger than this ⇒ another tick/chain is live; catch-up must not
 * start a parallel chain. Older than this but still under stale ⇒ resume.
 */
export const CATCHUP_ACTIVE_LEASE_MS = 5 * 60_000;

/**
 * Max `pipeline_runs` rows per week before catch-up refuses to open a *new* run.
 * Continuing a non-stale `running` row does not consume extra budget.
 * Monday primary fires share this counter (usually 1 run continued across ticks).
 */
export const CATCHUP_MAX_RUNS_PER_WEEK = 6;

export type CatchupHealthLike = {
  ok: boolean;
  reason?: string;
  run: {
    id: string;
    status: string;
    currentStep: string | null;
    updatedAt: Date;
  } | null;
};

export type CatchupDecision =
  | {
      action: "skip";
      reason: "already_published" | "already_running" | "circuit_open";
      runId?: string;
      currentStep?: string | null;
      runsThisWeek?: number;
      maxRuns?: number;
    }
  | {
      action: "run";
      reason: string;
      mode: "continue" | "start";
      runId?: string;
      runsThisWeek: number;
    };

function heartbeatAgeMs(run: { updatedAt: Date }) {
  return Date.now() - run.updatedAt.getTime();
}

export async function decideCatchupEntry(
  week: string,
  health: CatchupHealthLike
): Promise<CatchupDecision> {
  if (health.ok && health.run) {
    return {
      action: "skip",
      reason: "already_published",
      runId: health.run.id,
    };
  }

  const run = health.run;
  if (run?.status === "running") {
    const age = heartbeatAgeMs(run);
    if (age < CATCHUP_ACTIVE_LEASE_MS) {
      return {
        action: "skip",
        reason: "already_running",
        runId: run.id,
        currentStep: run.currentStep,
      };
    }
    if (age < PIPELINE_RUN_STALE_TIMEOUT_MS) {
      const runsThisWeek = await prisma.pipelineRun.count({ where: { week } });
      return {
        action: "run",
        reason: health.reason ?? "resume_cold_running",
        mode: "continue",
        runId: run.id,
        runsThisWeek,
      };
    }
    // Stale running: fall through; runPipelineTick/failStaleRunning remounts.
  }

  const runsThisWeek = await prisma.pipelineRun.count({ where: { week } });
  if (runsThisWeek >= CATCHUP_MAX_RUNS_PER_WEEK) {
    return {
      action: "skip",
      reason: "circuit_open",
      runId: run?.id,
      currentStep: run?.currentStep,
      runsThisWeek,
      maxRuns: CATCHUP_MAX_RUNS_PER_WEEK,
    };
  }

  return {
    action: "run",
    reason: health.reason ?? "catchup_needed",
    mode: "start",
    runId: run?.id,
    runsThisWeek,
  };
}
