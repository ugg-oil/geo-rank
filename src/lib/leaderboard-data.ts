import { LEGACY_COLLECTION_ENGINES } from "@/lib/constants";
import type { PeriodHighlight } from "@/lib/period-highlight";

export type { PeriodHighlight };

export type LeaderboardRow = {
  id: string;
  rank: number;
  brandId: string;
  brandName: string;
  /** URL-safe slug for the brand page (e.g. "github-copilot"). */
  brandSlug: string;
  /** Confirmed parent company at the time this leaderboard was published. */
  parentCompanyName?: string | null;
  score: number;
  appearanceRate: number;
  avgRank: number;
  modelCoverage: number | null;
};

export type PrevMetrics = {
  appearanceRate: number;
  avgRank: number;
};

export type LeaderboardView = {
  snapshots: LeaderboardRow[];
  prevRanks: Record<string, number>;
  hasPrevWeekData: boolean;
  /** P2-5: prior published period metrics per brand, for the movement overlay. */
  prevMetrics?: Record<string, PrevMetrics>;
};

export type AlsoMentionedRow = {
  brandId: string;
  brandName: string;
  brandSlug: string;
  parentCompanyName: string | null;
  mentionRate: number;
  cumulativeMentions: number;
  hasBrandPage: boolean;
};

export type CategoryBoardsData = {
  week: string;
  scoringVersion?: number;
  collectedEngines?: string[];
  scoringEngines?: string[];
  coverageExpansion?: string[];
  boards: Record<string, LeaderboardView>;
  /** P2: Overall-only also-mentioned preview (omit when empty). */
  alsoMentioned?: AlsoMentionedRow[];
  /** P3: one fact highlight vs prior published period (omit when none). */
  periodHighlight?: PeriodHighlight;
};

export function inferCollectedEngines(data: CategoryBoardsData): string[] {
  if (data.collectedEngines?.length) return data.collectedEngines;
  const fromBoards = Object.keys(data.boards).filter((key) => key !== "overall");
  return fromBoards.length > 0 ? fromBoards : [...LEGACY_COLLECTION_ENGINES];
}

export function inferScoringEngines(data: CategoryBoardsData): string[] {
  if (data.scoringEngines) return data.scoringEngines;
  return inferCollectedEngines(data).filter(
    (engine) => (data.boards[engine]?.snapshots.length ?? 0) > 0
  );
}
