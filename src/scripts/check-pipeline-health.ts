import "dotenv/config";
import { getPipelineHealth } from "@/lib/pipeline-health";
import { getCurrentWeek } from "@/lib/week";

const week = process.argv[2] ?? getCurrentWeek();

getPipelineHealth(week)
  .then((health) => {
    console.log(JSON.stringify(health, null, 2));
    process.exit(health.ok ? 0 : 1);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
