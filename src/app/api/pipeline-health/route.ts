import { NextRequest, NextResponse } from "next/server";
import { getPipelineHealth } from "@/lib/pipeline-health";
import { getCurrentWeek } from "@/lib/week";

/** Authenticated monitoring endpoint for Cron/Vercel checks. */
export async function GET(req: NextRequest) {
  const expectedSecret = process.env.CRON_SECRET ?? process.env.PIPELINE_SECRET;
  if (req.headers.get("authorization") !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const week = req.nextUrl.searchParams.get("week") ?? getCurrentWeek();
  const health = await getPipelineHealth(week);
  return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}
