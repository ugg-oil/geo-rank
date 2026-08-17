import { prisma, withPgRetry } from "@/lib/db";
import { normalizePeriodDate, toStoragePeriodKey, tryNormalizePeriodDate } from "@/lib/period";
import { ttlCache } from "@/lib/ttl-cache";

const MAX_PUBLISHED_WEEKS = 12;

/**
 * Newest-first overall weeks for a category (engine = null).
 * Shared by the week selector, prev-period deltas, and also-mentioned lookback.
 */
export async function listPublishedOverallWeeks(category: string): Promise<string[]> {
  return ttlCache(`overall-weeks:${category}`, 60_000, async () => {
    const snapshotCounts = await withPgRetry(() =>
      prisma.snapshot.groupBy({
        by: ["week"],
        where: { category, engine: null },
        _count: { id: true },
      })
    );
    return snapshotCounts
      .filter((row) => row._count.id > 0)
      .map((row) => {
        const date = tryNormalizePeriodDate(row.week);
        return date ? toStoragePeriodKey(date) : null;
      })
      .filter((week): week is string => Boolean(week))
      .sort((a, b) => b.localeCompare(a))
      .slice(0, MAX_PUBLISHED_WEEKS);
  });
}

/**
 * Previous period in the category's published snapshot sequence (not calendar -N days).
 * Each historical week key remains one point (P0-8).
 */
export async function findPreviousPublishedPeriod(
  category: string,
  week: string
): Promise<string | null> {
  const currentKey = toStoragePeriodKey(week);
  const weeks = await listPublishedOverallWeeks(category);
  const index = weeks.findIndex((candidate) => candidate === currentKey);
  if (index >= 0) return weeks[index + 1] ?? null;

  const currentDate = normalizePeriodDate(currentKey);
  return weeks.find((candidate) => normalizePeriodDate(candidate) < currentDate) ?? null;
}
