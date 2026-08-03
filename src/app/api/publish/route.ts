import { NextRequest, NextResponse } from "next/server";
import { publishLeaderboards } from "@/pipeline/publish";
import { getCurrentWeek } from "@/lib/week";
import { recordPublication, recordPublicationFailure } from "@/lib/pipeline-health";
import { errorContext, logPipelineEvent } from "@/lib/pipeline-observability";

/** Publish leaderboard JSON to Blob only (no collect/score). */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.PIPELINE_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const week = body.week ?? getCurrentWeek();

  try {
    const publication = await publishLeaderboards(week);
    await recordPublication(week, publication);
    return NextResponse.json({ ok: true, week, ...publication });
  } catch (err) {
    const error = errorContext(err);
    await recordPublicationFailure(week, error.message);
    logPipelineEvent({ event: "publish_api_failed", week, error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
