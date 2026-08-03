import { strict as assert } from "node:assert";
import { assessPublishedManifest } from "@/lib/pipeline-health";
import { CATEGORY_TO_SLUG } from "@/lib/categories";

const week = "Week of 2026-08-03";
const boards = Object.fromEntries(
  Object.values(CATEGORY_TO_SLUG).map((slug) => [slug, `https://example.test/${slug}.json`])
);

assert.equal(assessPublishedManifest({ week, boards }, week).ok, true);
assert.equal(assessPublishedManifest({ week: "Week of 2026-07-27", boards }, week).ok, false);
assert.equal(assessPublishedManifest({ week, boards: { ...boards, "ai-tools": "" } }, week).ok, false);
console.log("Pipeline manifest fixtures passed: valid, stale-week, and missing-board cases.");
