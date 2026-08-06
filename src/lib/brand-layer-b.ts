/**
 * Layer A for a week = brand appears in at least one published overall Top 20.
 * Layer B = the latest 4 published weeks are all Layer A (consecutive).
 */
export function isLayerAForWeek(
  slug: string,
  categoryRowsBySlug: Record<string, { brandSlug: string }[]>
) {
  return Object.values(categoryRowsBySlug).some((rows) =>
    rows.some((row) => row.brandSlug === slug)
  );
}

export function evaluateLayerB(
  slug: string,
  weeksNewestFirst: string[],
  boardsByWeek: Record<string, Record<string, { brandSlug: string }[]>>
) {
  const recent = weeksNewestFirst.slice(0, 4);
  if (recent.length < 4) {
    return {
      layerB: false as const,
      consecutiveLayerA: recent.filter((week) =>
        isLayerAForWeek(slug, boardsByWeek[week] ?? {})
      ).length,
      windowWeeks: recent,
    };
  }

  let consecutive = 0;
  for (const week of recent) {
    if (!isLayerAForWeek(slug, boardsByWeek[week] ?? {})) break;
    consecutive += 1;
  }

  return {
    layerB: consecutive === 4,
    consecutiveLayerA: consecutive,
    windowWeeks: recent,
  };
}
