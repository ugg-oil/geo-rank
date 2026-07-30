import { exportReview } from "@/pipeline/review";
import { getCurrentWeek } from "@/lib/week";

const week = process.argv[2] ?? getCurrentWeek();

exportReview(week)
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
