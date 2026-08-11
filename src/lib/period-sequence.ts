import { prisma } from "@/lib/db";
import { normalizePeriodDate, toStoragePeriodKey } from "@/lib/period";

/**
 * Previous period in the category's published snapshot sequence (not calendar -N days).
 * Each historical week key remains one point (P0-8).
 */
export async function findPreviousPublishedPeriod(
  category: string,
  week: string
): Promise<string | null> {
  const currentKey = toStoragePeriodKey(week);
  const currentDate = normalizePeriodDate(currentKey);

  const rows = await prisma.snapshot.findMany({
    where: { category },
    select: { week: true },
    distinct: ["week"],
  });

  const earlier = rows
    .map((row) => row.week)
    .filter((candidate) => {
      try {
        return normalizePeriodDate(candidate) < currentDate;
      } catch {
        return false;
      }
    })
    .sort((a, b) => normalizePeriodDate(b).localeCompare(normalizePeriodDate(a)));

  return earlier[0] ?? null;
}
