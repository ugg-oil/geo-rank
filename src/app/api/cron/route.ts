import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { runPipelineTick } from "@/pipeline/run";
import { getCurrentWeek } from "@/lib/week";
import { getPipelineHealth } from "@/lib/pipeline-health";
import { errorContext, logPipelineEvent, sendPipelineAlert } from "@/lib/pipeline-observability";

/** One engine/stage tick — keep under typical Pro serverless limits. */
export const maxDuration = 300;

const MAX_CHAIN_DEPTH = 12;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET ?? process.env.PIPELINE_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const week = getCurrentWeek();
  const chainDepth = Number(req.headers.get("x-pipeline-chain-depth") || "0");

  try {
    const result = await runPipelineTick(week);

    if (!result.done && chainDepth < MAX_CHAIN_DEPTH) {
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
