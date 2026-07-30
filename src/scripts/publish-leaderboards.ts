import "dotenv/config";
import { publishLeaderboards } from "@/pipeline/publish";
import { getCurrentWeek } from "@/lib/week";

const week = process.argv[2] ?? getCurrentWeek();

publishLeaderboards(week)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
