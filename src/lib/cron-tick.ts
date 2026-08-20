import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { runPipelineTick } from "@/pipeline/run";
import { getCurrentWeek } from "@/lib/week";
import { getPipelineHealth } from "@/lib/pipeline-health";
import { errorContext, logPipelineEvent, sendPipelineAlert } from "@/lib/pipeline-observability";
import {
  decideCatchupEntry,
  loadCatchupRunSnapshot,
  PIPELINE_CRON_MAX_CHAIN_DEPTH,
} from "@/lib/cron-catchup-policy";

export type CronTickOptions = {
  /**
   * Catch-up entry applies a cheap `pipeline_runs` gate: published skip,
   * active-lease skip, cold-running resume, and per-week circuit breaker.
   * Monday `/api/cron` leaves this unset so the primary schedule always ticks.
   */
  skipWhenHealthy?: boolean;
};

export async function handleCronTick(req: NextRequest, options: CronTickOptions = {}) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET ?? process.env.PIPELINE_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const week = getCurrentWeek();
  const chainDepth = Number(req.headers.get("x-pipeline-chain-depth") || "0");

  try {
    // Only the entry fire gates; chained ticks are mid-run by definition.
    // Cheap: one `pipeline_runs` row. Full coverage health runs after a done tick.
    if (options.skipWhenHealthy && chainDepth === 0) {
      const snapshot = await loadCatchupRunSnapshot(week);
      const decision = await decideCatchupEntry(week, snapshot);

      if (decision.action === "skip") {
        logPipelineEvent({
          event: `catchup_skipped_${decision.reason}`,
          week,
          runId: decision.runId,
          stage: decision.currentStep ?? undefined,
          runsThisWeek: decision.runsThisWeek,
          maxRuns: decision.maxRuns,
        });
        if (decision.reason === "circuit_open") {
          await sendPipelineAlert({
            event: "catchup_circuit_open",
            week,
            runId: decision.runId,
            reason: decision.reason,
            runsThisWeek: decision.runsThisWeek,
            maxRuns: decision.maxRuns,
          });
        }
        return NextResponse.json({
          ok: true,
          week,
          skipped: decision.reason,
          runId: decision.runId,
          currentStep: decision.currentStep,
          runsThisWeek: decision.runsThisWeek,
          maxRuns: decision.maxRuns,
        });
      }

      logPipelineEvent({
        event: "catchup_started",
        week,
        reason: decision.reason,
        mode: decision.mode,
        runId: decision.runId,
        runsThisWeek: decision.runsThisWeek,
      });
    }

    const result = await runPipelineTick(week);

    if (!result.done && chainDepth < PIPELINE_CRON_MAX_CHAIN_DEPTH) {
      const continueUrl = new URL(req.url);
      const auth = authHeader!;
      after(() => {
        void fetch(continueUrl, {
          headers: {
            authorization: auth,
            "x-pipeline-chain-depth": String(chainDepth + 1),
          },
          cache: "no-store",
        }).catch((error) => {
          logPipelineEvent({
            event: "cron_chain_failed",
            week,
            runId: result.runId,
            error: errorContext(error),
            chainDepth,
          });
        });
      });
    }

    if (result.done) {
      const health = await getPipelineHealth(week);
      if (!health.ok) {
        await sendPipelineAlert({
          event: "cron_health_check_failed",
          week,
          reason: health.reason,
          runId: health.run?.id,
          coverage:
            "coverage" in health ? health.coverage : undefined,
        });
        return NextResponse.json({ ok: false, ...result, health }, { status: 500 });
      }
      logPipelineEvent({ event: "cron_health_check_passed", week, runId: health.run.id });
      return NextResponse.json({ ok: true, ...result, health });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const error = errorContext(err);
    await sendPipelineAlert({ event: "cron_failed", week, error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
