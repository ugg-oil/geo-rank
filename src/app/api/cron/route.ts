import { NextRequest, NextResponse } from "next/server";
import { runFullPipeline } from "@/pipeline/run";
import { getCurrentWeek } from "@/lib/week";
import { getPipelineHealth } from "@/lib/pipeline-health";
import { errorContext, logPipelineEvent, sendPipelineAlert } from "@/lib/pipeline-observability";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET ?? process.env.PIPELINE_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const week = getCurrentWeek();

  try {
    const result = await runFullPipeline(week);
    const health = await getPipelineHealth(week);
    if (!health.ok) {
      await sendPipelineAlert({ event: "cron_health_check_failed", week, reason: health.reason, runId: health.run?.id });
      return NextResponse.json({ ok: false, ...result, health }, { status: 500 });
    }
    logPipelineEvent({ event: "cron_health_check_passed", week, runId: health.run.id });
    return NextResponse.json({ ok: true, ...result, health });
  } catch (err) {
    const error = errorContext(err);
    await sendPipelineAlert({ event: "cron_failed", week, error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
