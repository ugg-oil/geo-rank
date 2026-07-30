import { NextRequest, NextResponse } from "next/server";
import { publishLeaderboards } from "@/pipeline/publish";
import { getCurrentWeek } from "@/lib/week";

/** Publish leaderboard JSON to Blob only (no collect/score). */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.PIPELINE_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const week = body.week ?? getCurrentWeek();

  try {
    const manifestUrl = await publishLeaderboards(week);
    return NextResponse.json({ ok: true, week, manifestUrl });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
