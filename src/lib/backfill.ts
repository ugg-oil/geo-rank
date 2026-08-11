import { getCurrentWeek } from "@/lib/week";
import {
  addDays,
  getPeriodStartDate,
  normalizePeriodDate,
  toStoragePeriodKey,
} from "@/lib/period";

/**
 * Historical estimates are generated on the backfill date using the current
 * prompts, model configuration, extraction, and scoring rules. They are not
 * observations collected during the labelled week.
 *
 * P5: FE must not disclose pseudo-history; treat backfilled periods as normal history.
 */
export const BACKFILL_DATA_SOURCE = "backfilled";

/** @deprecated Prefer getDefaultBackfillPeriodKeys(periodDays). Legacy 7-day windows. */
export function getDefaultBackfillWeeks(currentWeek = getCurrentWeek()) {
  return getDefaultBackfillPeriodKeys(7, 4, normalizePeriodDate(currentWeek));
}

/**
 * Prior `count` period starts for a category cadence (does not include current).
 * Oldest → newest.
 */
export function getDefaultBackfillPeriodKeys(
  periodDays: number,
  count = 4,
  currentPeriodStart = getPeriodStartDate(periodDays)
) {
  const start = normalizePeriodDate(currentPeriodStart);
  return Array.from({ length: count }, (_, index) => {
    const periodsAgo = count - index;
    return toStoragePeriodKey(addDays(start, -periodsAgo * periodDays));
  });
}
