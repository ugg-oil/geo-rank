import assert from "node:assert/strict";
import {
  addDays,
  backfillPromptSuffix,
  formatPeriodDate,
  getPreviousWeek,
  normalizePeriodDate,
  shouldCollectCategoryInPeriod,
  toStoragePeriodKey,
} from "@/lib/period";
import { getCategoryPeriodDays } from "@/lib/category-period";
import { getDefaultBackfillPeriodKeys, getLaunchBackfillPeriodKeys } from "@/lib/backfill";

assert.equal(normalizePeriodDate("Week of 2026-07-27"), "2026-07-27");
assert.equal(normalizePeriodDate("2026-07-27"), "2026-07-27");
assert.equal(toStoragePeriodKey("2026-07-27"), "Week of 2026-07-27");
assert.equal(formatPeriodDate("Week of 2026-07-27"), "2026-07-27");
assert.equal(getPreviousWeek("Week of 2026-07-27"), "Week of 2026-07-20");
assert.equal(getPreviousWeek("Week of 2026-07-27", 14), "Week of 2026-07-13");
assert.equal(getPreviousWeek("Week of 2026-08-24", 21), "Week of 2026-08-03");
assert.equal(addDays("2026-07-27", -7), "2026-07-20");
assert.equal(backfillPromptSuffix("Week of 2026-07-27"), " as of 2026-07-27");
assert.equal(backfillPromptSuffix("2026-07-27"), " as of 2026-07-27");

// phase-6 cadence: former 7 → 14, former 14 → 21; unknown stays 7.
assert.equal(getCategoryPeriodDays("AI Tools"), 14);
assert.equal(getCategoryPeriodDays("AI Image / Video Tools"), 14);
assert.equal(getCategoryPeriodDays("Marketing Tools"), 14);
assert.equal(getCategoryPeriodDays("AI Meeting Assistants"), 14);
assert.equal(getCategoryPeriodDays("AI Cybersecurity Tools"), 14);
assert.equal(getCategoryPeriodDays("SaaS Software"), 21);
assert.equal(getCategoryPeriodDays("VPN Services"), 21);
assert.equal(getCategoryPeriodDays("HR Software"), 21);
assert.equal(getCategoryPeriodDays("Unknown"), 7);

// Due = last published start + periodDays (exact Monday). No history → due.
assert.equal(shouldCollectCategoryInPeriod(7, "Week of 2026-08-31", null), true);
assert.equal(
  shouldCollectCategoryInPeriod(7, "Week of 2026-08-31", "Week of 2026-08-24"),
  true
);
assert.equal(
  shouldCollectCategoryInPeriod(7, "Week of 2026-08-31", "Week of 2026-08-17"),
  false
);

// SaaS-style: latest 08-10, 21-day → due 08-31 (not epoch lattice 09-14).
assert.equal(
  shouldCollectCategoryInPeriod(21, "Week of 2026-08-31", "Week of 2026-08-10"),
  true
);
assert.equal(
  shouldCollectCategoryInPeriod(21, "Week of 2026-09-14", "Week of 2026-08-10"),
  false
);

// Shared latest 08-24: 14 → 09-07; 21 → 09-14.
assert.equal(
  shouldCollectCategoryInPeriod(14, "Week of 2026-09-07", "Week of 2026-08-24"),
  true
);
assert.equal(
  shouldCollectCategoryInPeriod(21, "Week of 2026-09-14", "Week of 2026-08-24"),
  true
);
assert.equal(
  shouldCollectCategoryInPeriod(14, "Week of 2026-09-14", "Week of 2026-08-24"),
  false
);
assert.equal(
  shouldCollectCategoryInPeriod(21, "Week of 2026-09-07", "Week of 2026-08-24"),
  false
);

// Same-Monday retry before publish: still due.
assert.equal(
  shouldCollectCategoryInPeriod(21, "Week of 2026-08-31", "Week of 2026-08-10"),
  true
);

const backfill7 = getDefaultBackfillPeriodKeys(7, 4, "2026-08-04");
assert.deepEqual(backfill7, [
  "Week of 2026-07-07",
  "Week of 2026-07-14",
  "Week of 2026-07-21",
  "Week of 2026-07-28",
]);
const backfill14 = getDefaultBackfillPeriodKeys(14, 4, "2026-07-28");
assert.equal(backfill14.length, 4);
assert.equal(backfill14[0], "Week of 2026-06-02");
assert.equal(backfill14[3], "Week of 2026-07-14");

const launch14 = getLaunchBackfillPeriodKeys(14, 4, "2026-08-10");
assert.deepEqual(launch14, [
  "Week of 2026-06-29",
  "Week of 2026-07-13",
  "Week of 2026-07-27",
  "Week of 2026-08-10",
]);

console.log("period fixtures ok");
