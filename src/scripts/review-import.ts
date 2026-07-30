import { importReview } from "@/pipeline/review";

importReview(process.argv[2])
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
