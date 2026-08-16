/**
 * P4 competition quadrant: Overall Top 20 scatter of mention frequency vs avg rank.
 *
 * Default label rule (P4-6): label at most DEFAULT_LABEL_LIMIT points with the
 * greatest normalized distance from the period median crosshair (ties → better
 * avgRank → brandSlug). Hover / focus / tap always reveals the name.
 */

export const QUADRANT_MIN_POINTS = 2;
export const DEFAULT_LABEL_LIMIT = 4;

export type QuadrantPointInput = {
  brandId: string;
  brandName: string;
  brandSlug: string;
  appearanceRate: number;
  avgRank: number;
};

export type FrequencyBand = "high" | "lower";
export type PositionBand = "high" | "lower";

export type QuadrantId =
  | "high_freq_high_pos"
  | "high_freq_lower_pos"
  | "lower_freq_high_pos"
  | "lower_freq_lower_pos";

export type QuadrantClassification = {
  frequency: FrequencyBand;
  position: PositionBand;
  quadrant: QuadrantId;
};

export type QuadrantPoint = QuadrantPointInput &
  QuadrantClassification & {
    /** Show brand name by default (sparse landmarks). */
    defaultLabel: boolean;
  };

export type CompetitionQuadrantModel = {
  points: QuadrantPoint[];
  medianFrequency: number;
  medianAvgRank: number;
};

export type PeriodMetrics = {
  appearanceRate: number;
  avgRank: number;
};

export type QuadrantMovement = {
  point: QuadrantPoint;
  prev: PeriodMetrics;
};

/**
 * P2-5: pair each current point with its prior published period position.
 * Only brands present in both periods qualify, and unchanged positions are
 * dropped so the chart doesn't draw zero-length arrows.
 */
export function selectQuadrantMovements(
  points: readonly QuadrantPoint[],
  prevMetrics: Record<string, PeriodMetrics> | undefined
): QuadrantMovement[] {
  if (!prevMetrics) return [];
  const movements: QuadrantMovement[] = [];
  for (const point of points) {
    const prev = prevMetrics[point.brandId];
    if (!prev) continue;
    if (
      prev.appearanceRate === point.appearanceRate &&
      prev.avgRank === point.avgRank
    ) {
      continue;
    }
    movements.push({ point, prev });
  }
  return movements;
}

/** Standard median; even length → average of two middle values. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

/**
 * On median line: frequency ≥ median → High frequency;
 * averageRank ≤ median → High position (#1 is better).
 */
export function classifyQuadrant(
  appearanceRate: number,
  avgRank: number,
  medianFrequency: number,
  medianAvgRank: number
): QuadrantClassification {
  const frequency: FrequencyBand =
    appearanceRate >= medianFrequency ? "high" : "lower";
  const position: PositionBand = avgRank <= medianAvgRank ? "high" : "lower";
  const quadrant: QuadrantId =
    frequency === "high"
      ? position === "high"
        ? "high_freq_high_pos"
        : "high_freq_lower_pos"
      : position === "high"
        ? "lower_freq_high_pos"
        : "lower_freq_lower_pos";
  return { frequency, position, quadrant };
}

function normalizedDistance(
  appearanceRate: number,
  avgRank: number,
  medianFrequency: number,
  medianAvgRank: number,
  freqSpan: number,
  rankSpan: number
): number {
  const dx = (appearanceRate - medianFrequency) / freqSpan;
  const dy = (avgRank - medianAvgRank) / rankSpan;
  return Math.hypot(dx, dy);
}

/**
 * Pick landmark brandIds farthest from the median (normalized).
 */
export function selectDefaultLabelIds(
  points: Array<{
    brandId: string;
    brandSlug: string;
    appearanceRate: number;
    avgRank: number;
  }>,
  medianFrequency: number,
  medianAvgRank: number,
  limit = DEFAULT_LABEL_LIMIT
): Set<string> {
  if (points.length === 0 || limit <= 0) return new Set();

  const freqs = points.map((p) => p.appearanceRate);
  const ranks = points.map((p) => p.avgRank);
  const freqSpan = Math.max(...freqs) - Math.min(...freqs) || 1;
  const rankSpan = Math.max(...ranks) - Math.min(...ranks) || 1;

  const ranked = points
    .map((p) => ({
      ...p,
      dist: normalizedDistance(
        p.appearanceRate,
        p.avgRank,
        medianFrequency,
        medianAvgRank,
        freqSpan,
        rankSpan
      ),
    }))
    .sort((a, b) => {
      if (b.dist !== a.dist) return b.dist - a.dist;
      if (a.avgRank !== b.avgRank) return a.avgRank - b.avgRank;
      return a.brandSlug.localeCompare(b.brandSlug);
    });

  return new Set(ranked.slice(0, limit).map((p) => p.brandId));
}

/** Build chart model from Overall Top 20 rows. Returns null if too few points. */
export function buildCompetitionQuadrant(
  rows: QuadrantPointInput[],
  options?: { labelLimit?: number; minPoints?: number }
): CompetitionQuadrantModel | null {
  const minPoints = options?.minPoints ?? QUADRANT_MIN_POINTS;
  const labelLimit = options?.labelLimit ?? DEFAULT_LABEL_LIMIT;
  if (rows.length < minPoints) return null;

  const medianFrequency = median(rows.map((r) => r.appearanceRate));
  const medianAvgRank = median(rows.map((r) => r.avgRank));
  if (medianFrequency === null || medianAvgRank === null) return null;

  const labelIds = selectDefaultLabelIds(
    rows,
    medianFrequency,
    medianAvgRank,
    labelLimit
  );

  const points: QuadrantPoint[] = rows.map((row) => ({
    ...row,
    ...classifyQuadrant(
      row.appearanceRate,
      row.avgRank,
      medianFrequency,
      medianAvgRank
    ),
    defaultLabel: labelIds.has(row.brandId),
  }));

  return { points, medianFrequency, medianAvgRank };
}
