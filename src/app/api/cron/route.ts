import { NextRequest } from "next/server";
import { handleCronTick } from "@/lib/cron-tick";

/** One engine/stage tick — keep under typical Pro serverless limits. */
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  return handleCronTick(req);
}
