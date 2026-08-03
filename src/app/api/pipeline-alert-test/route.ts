import { NextRequest, NextResponse } from "next/server";
import { sendPipelineAlert } from "@/lib/pipeline-observability";
import { getCurrentWeek } from "@/lib/week";

/** Authenticated, side-effect-only email delivery check. It never runs the pipeline. */
export async function POST(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.PIPELINE_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const week = getCurrentWeek();
  const delivery = await sendPipelineAlert({
    event: "manual_alert_test",
    week,
    message: "This is a delivery test. No pipeline was run.",
  });
  if (!delivery.delivered) {
    return NextResponse.json(
      { ok: false, channel: delivery.channel, error: delivery.error ?? "No alert delivery channel accepted the test" },
      { status: 503 }
    );
  }
  return NextResponse.json({ ok: true, week, channel: delivery.channel, message: "Alert delivery accepted" });
}
