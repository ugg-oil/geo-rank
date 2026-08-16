import { computeTrendLabel, type TrendLabel } from "@/lib/brand-trend-label";
import type { BrandHistoryPoint } from "@/lib/brand-history-data";
import type { BrandPageEngineEntry } from "@/lib/brand-page";

export type WhyEngineStrength = {
  engine: string;
  rank: number;
  reason: "best" | "beats_overall";
};

export type WhyEngineWeakness =
  | { engine: string; kind: "absent" }
  | { engine: string; kind: "weak"; rank: number };

export type WhyCardsResult = {
  enginesClose: boolean;
  strengths: WhyEngineStrength[];
  weaknesses: WhyEngineWeakness[];
  trend: TrendLabel | null;
};

const CLOSE_SPAN = 2;
const BEATS_OVERALL_BY = 2;

/**
 * Structured Why cards (P3-2). Pure rules, no LLM.
 * Close engines (max−min ≤ 2, no collected missing) → no hard strength/weak split.
 */
export function buildWhyCards(args: {
  overallRank: number;
  engines: Record<string, BrandPageEngineEntry>;
  collectedEngines: readonly string[];
  history: BrandHistoryPoint[];
}): WhyCardsResult {
  const collected = [...new Set(args.collectedEngines)];
  const ranked = collected
    .filter((engine) => args.engines[engine])
    .map((engine) => ({ engine, rank: args.engines[engine]!.rank }))
    .sort((a, b) => a.rank - b.rank || a.engine.localeCompare(b.engine));

  const absent = collected.filter((engine) => !args.engines[engine]);
  const trend = computeTrendLabel(args.history);

  if (ranked.length === 0) {
    return {
      enginesClose: false,
      strengths: [],
      weaknesses: absent.map((engine) => ({ engine, kind: "absent" as const })),
      trend,
    };
  }

  const ranks = ranked.map((row) => row.rank);
  const span = Math.max(...ranks) - Math.min(...ranks);
  const enginesClose = absent.length === 0 && span <= CLOSE_SPAN;

  if (enginesClose) {
    return { enginesClose: true, strengths: [], weaknesses: [], trend };
  }

  const bestRank = ranked[0]!.rank;
  const bestEngines = ranked.filter((row) => row.rank === bestRank);
  const secondBest =
    bestEngines.length === 1
      ? ranked.find((row) => row.rank > bestRank)
      : undefined;

  const strengthKeys = new Set<string>();
  const strengths: WhyEngineStrength[] = [];

  for (const row of bestEngines.slice(0, 2)) {
    strengthKeys.add(row.engine);
    strengths.push({ engine: row.engine, rank: row.rank, reason: "best" });
  }
  if (secondBest && strengths.length < 2 && !strengthKeys.has(secondBest.engine)) {
    strengthKeys.add(secondBest.engine);
    strengths.push({
      engine: secondBest.engine,
      rank: secondBest.rank,
      reason: "best",
    });
  }

  for (const row of ranked) {
    if (strengthKeys.has(row.engine)) continue;
    if (args.overallRank - row.rank >= BEATS_OVERALL_BY) {
      strengthKeys.add(row.engine);
      strengths.push({
        engine: row.engine,
        rank: row.rank,
        reason: "beats_overall",
      });
    }
  }

  strengths.sort((a, b) => a.rank - b.rank || a.engine.localeCompare(b.engine));

  const weaknesses: WhyEngineWeakness[] = absent.map((engine) => ({
    engine,
    kind: "absent" as const,
  }));

  const worstRank = ranked[ranked.length - 1]!.rank;
  const worstEngines = ranked
    .filter((row) => row.rank === worstRank && !strengthKeys.has(row.engine))
    .slice(-2);
  const secondWorst =
    worstEngines.length < 2
      ? [...ranked]
          .reverse()
          .find((row) => row.rank < worstRank && !strengthKeys.has(row.engine))
      : undefined;

  for (const row of worstEngines) {
    weaknesses.push({ engine: row.engine, kind: "weak", rank: row.rank });
  }
  if (secondWorst) {
    weaknesses.push({
      engine: secondWorst.engine,
      kind: "weak",
      rank: secondWorst.rank,
    });
  }

  weaknesses.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "absent" ? -1 : 1;
    if (a.kind === "weak" && b.kind === "weak") {
      return b.rank - a.rank || a.engine.localeCompare(b.engine);
    }
    return a.engine.localeCompare(b.engine);
  });

  return {
    enginesClose: false,
    strengths,
    weaknesses: weaknesses.slice(0, Math.max(2, absent.length)),
    trend,
  };
}

/** Filter history points to an inclusive start/end period range (YYYY-MM-DD). */
export function filterHistoryByRange(
  points: BrandHistoryPoint[],
  startDate: string,
  endDate: string
): BrandHistoryPoint[] {
  const start = startDate <= endDate ? startDate : endDate;
  const end = startDate <= endDate ? endDate : startDate;
  return points.filter((p) => {
    const d = p.weekDate.replace(/^Week of\s+/i, "");
    return d >= start && d <= end;
  });
}
