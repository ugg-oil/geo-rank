import assert from "node:assert/strict";
import {
  addDays,
  backfillPromptSuffix,
  formatPeriodDate,
  getPeriodStartDate,
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
assert.equal(addDays("2026-07-27", -7), "2026-07-20");
assert.equal(backfillPromptSuffix("Week of 2026-07-27"), " as of 2026-07-27");
assert.equal(backfillPromptSuffix("2026-07-27"), " as of 2026-07-27");

assert.equal(getCategoryPeriodDays("AI Tools"), 7);
assert.equal(getCategoryPeriodDays("SaaS Software"), 14);
assert.equal(getCategoryPeriodDays("VPN Services"), 14);
assert.equal(getCategoryPeriodDays("AI Meeting Assistants"), 7);
assert.equal(getCategoryPeriodDays("Unknown"), 7);

// 7-day categories always collect on the current Monday key.
const mondayKey = toStoragePeriodKey(getPeriodStartDate(7));
assert.equal(shouldCollectCategoryInPeriod(7, mondayKey), true);

// Historical Monday must also be collectable for 7-day (backfill).
assert.equal(shouldCollectCategoryInPeriod(7, "Week of 2026-06-01"), true);

// 14-day: only when run key equals aligned 14-day bucket start.
const fourteenStart = getPeriodStartDate(14);
assert.equal(shouldCollectCategoryInPeriod(14, toStoragePeriodKey(fourteenStart)), true);
if (fourteenStart !== normalizePeriodDate(mondayKey)) {
  assert.equal(shouldCollectCategoryInPeriod(14, mondayKey), false);
}

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
