import { runFullPipeline } from "@/pipeline/run";

const week = process.argv[2];

runFullPipeline(week)
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
