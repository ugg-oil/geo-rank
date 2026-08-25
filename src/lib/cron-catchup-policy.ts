import { prisma } from "@/lib/db";
import { PIPELINE_RUN_STALE_TIMEOUT_MS } from "@/lib/pipeline-timeouts";
import { weekHasIdleCollectionEngines } from "@/lib/collection-progress";

/**
 * Catch-up policy for `/api/cron/catchup`.
 *
 * Design goals (one package, not one-off patches):
 * - Recover within ~1h after infra blips without waiting until next Monday.
 * - Never fight an actively chaining worker (short lease).
 * - Resume cold `running` rows instead of sitting until the 90m stale timeout.
 * - Cap remounts so structural gaps cannot burn API forever.
 * - Keep Monday `/api/cron` as the primary schedule (no circuit there).
 * - Entry gate must be cheap: GHA pokes with `curl --max-time 25`. Full
 *   `getPipelineHealth()` (prompts/responses/snapshots) stays after the tick.
 * - `success` + snapshots still resumes remaining engines (Perplexity/Claude/DeepSeek)
 *   after the first overall publish.
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

/** Latest `pipeline_runs` row only — no coverage scans. */
export type CatchupRunSnapshot = {
  id: string;
  status: string;
  currentStep: string | null;
  updatedAt: Date;
  snapshotCount: number | null;
} | null;

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

export async function loadCatchupRunSnapshot(week: string): Promise<CatchupRunSnapshot> {
  return prisma.pipelineRun.findFirst({
    where: { week },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      status: true,
      currentStep: true,
      updatedAt: true,
      snapshotCount: true,
    },
  });
}

function entryReason(run: CatchupRunSnapshot): string {
  if (!run) return "no pipeline run found";
  if (run.status === "running") return "resume_cold_running";
  if (run.status === "success") return "success_without_snapshots";
  return `run status is ${run.status}`;
}

export async function decideCatchupEntry(
  week: string,
  run: CatchupRunSnapshot
): Promise<CatchupDecision> {
  if (run?.status === "success" && (run.snapshotCount ?? 0) > 0) {
    if (await weekHasIdleCollectionEngines(week)) {
      const runsThisWeek = await prisma.pipelineRun.count({ where: { week } });
      if (runsThisWeek >= CATCHUP_MAX_RUNS_PER_WEEK) {
        return {
          action: "skip",
          reason: "circuit_open",
          runId: run.id,
          runsThisWeek,
          maxRuns: CATCHUP_MAX_RUNS_PER_WEEK,
        };
      }
      return {
        action: "run",
        reason: "remaining_engines",
        mode: "start",
        runId: run.id,
        runsThisWeek,
      };
    }
    return {
      action: "skip",
      reason: "already_published",
      runId: run.id,
    };
  }

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
        reason: entryReason(run),
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
    reason: entryReason(run),
    mode: "start",
    runId: run?.id,
    runsThisWeek,
  };
}
