import { NextRequest, NextResponse } from "next/server";
import { runFullPipeline } from "@/pipeline/run";
import { getCurrentWeek } from "@/lib/week";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.PIPELINE_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const week = body.week ?? getCurrentWeek();

  try {
    const result = await runFullPipeline(week);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
