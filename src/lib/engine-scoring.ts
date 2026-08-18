import {
  SCORING_ELIGIBLE_ENGINES,
  VALID_RESPONSE_THRESHOLD,
  MIN_SCORING_ENGINES_FOR_OVERALL,
  MAX_CATEGORY_ENGINE_RETRIES,
} from "@/lib/constants";

export type EngineCounts = { total: number; ok: number };

export function isEngineValid(
  counts: EngineCounts | undefined,
  threshold = VALID_RESPONSE_THRESHOLD
) {
  if (!counts || counts.total <= 0) return false;
  return counts.ok / counts.total >= threshold;
}

export function selectScoringEngines(
  validity: Record<string, boolean> | Map<string, boolean>,
  eligible: readonly string[] = SCORING_ELIGIBLE_ENGINES
) {
  const get = (engine: string) =>
    validity instanceof Map ? Boolean(validity.get(engine)) : Boolean(validity[engine]);
  return eligible.filter((engine) => get(engine));
}

export function canPublishOverall(scoringEngines: readonly string[]) {
  return scoringEngines.length >= MIN_SCORING_ENGINES_FOR_OVERALL;
}

export function modelCoverageScore(mentionedScoringEngines: number, scoringEngineCount: number) {
  if (scoringEngineCount <= 0) return 0;
  return mentionedScoringEngines / scoringEngineCount;
}

/**
 * Overall Top N eligibility (P6-2).
 * Pass if appearance ≥ 10% OR mentioned by ≥ 2 scoring engines.
 */
export function meetsOverallBoardGate(options: {
  appearanceRate: number;
  scoringEngineMentions: number;
  minAppearanceRate?: number;
  minScoringEngines?: number;
}) {
  const minAppearance = options.minAppearanceRate ?? 0.1;
  const minEngines = options.minScoringEngines ?? 2;
  return (
    options.appearanceRate >= minAppearance ||
    options.scoringEngineMentions >= minEngines
  );
}

export function coverageExpansionEngines(
  currentScoring: readonly string[],
  previousScoring: readonly string[]
) {
  if (previousScoring.length === 0) return [];
  return currentScoring.filter((engine) => !previousScoring.includes(engine));
}

export function canRetryCategoryEngine(
  attempts: number,
  options: { maxAttempts?: number; override?: boolean } = {}
) {
  if (options.override) return true;
  return attempts < (options.maxAttempts ?? MAX_CATEGORY_ENGINE_RETRIES);
}
