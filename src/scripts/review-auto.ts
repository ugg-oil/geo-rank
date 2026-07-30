import { autoReviewWeek } from "@/pipeline/review-auto";
import { getCurrentWeek } from "@/lib/week";

function readArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

const week = process.argv[2]?.startsWith("Week of")
  ? process.argv[2]
  : getCurrentWeek();
const apply = process.argv.includes("--apply");
const useLlm = process.argv.includes("--llm");
const minConfidence =
  (readArg("--min-confidence") as "high" | "medium" | "low" | undefined) ??
  "high";

autoReviewWeek({ week, apply, useLlm, minConfidence })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
