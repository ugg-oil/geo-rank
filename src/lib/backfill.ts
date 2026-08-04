import { getCurrentWeek } from "@/lib/week";

/**
 * Historical estimates are generated on the backfill date using the current
 * prompts, model configuration, extraction, and scoring rules. They are not
 * observations collected during the labelled week.
 */
export const BACKFILL_DATA_SOURCE = "backfilled";

export function getDefaultBackfillWeeks(currentWeek = getCurrentWeek()) {
  const current = new Date(currentWeek.replace("Week of ", "") + "T00:00:00Z");
  return [4, 3, 2, 1].map((weeksAgo) => {
    const date = new Date(current);
    date.setUTCDate(date.getUTCDate() - weeksAgo * 7);
    return `Week of ${date.toISOString().slice(0, 10)}`;
  });
}
