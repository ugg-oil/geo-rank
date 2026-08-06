import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local" });

import { prisma } from "@/lib/db";
import {
  CATEGORIES,
  COLLECTION_ENGINES,
  PROMPTS_PER_CATEGORY,
  weeklyPromptCount,
} from "@/lib/constants";

async function main() {
  const recent = await prisma.response.findMany({
    where: { tokenCost: { not: null } },
    select: { tokenCost: true, engine: true, week: true },
    orderBy: { createdAt: "desc" },
    take: 2000,
  });

  if (recent.length === 0) {
    console.log(JSON.stringify({ ok: false, reason: "no tokenCost rows" }, null, 2));
    return;
  }

  const avg =
    recent.reduce((sum, row) => sum + (row.tokenCost ?? 0), 0) / recent.length;
  const weeklyVolume = weeklyPromptCount();
  const monthly = avg * weeklyVolume * 4;

  console.log(
    JSON.stringify(
      {
        sampleSize: recent.length,
        avgTokenCost: Number(avg.toFixed(6)),
        collectedEngines: [...COLLECTION_ENGINES],
        categories: CATEGORIES.length,
        promptsPerCategory: PROMPTS_PER_CATEGORY,
        weeklyRequests: weeklyVolume,
        estimatedMonthlyUsd: Number(monthly.toFixed(2)),
      },
      null,
      2
    )
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
