import { NextRequest, NextResponse } from "next/server";
import { runFullPipeline } from "@/pipeline/run";
import { getCurrentWeek } from "@/lib/week";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET ?? process.env.PIPELINE_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const week = getCurrentWeek();

  try {
    await runFullPipeline(week);
    return NextResponse.json({ ok: true, week });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
