import assert from "node:assert/strict";
import {
  canCompare,
  COMPARE_MAX,
  compareBestValue,
  compareMetricKeys,
  DEFAULT_SORT_KEY,
  isAscendingSort,
  nextSortState,
  resolveSortKey,
  sortLeaderboardRows,
  toggleCompareSelection,
  type SortKey,
} from "@/lib/category-board-view";
import {
  buildCompetitionQuadrant,
  selectQuadrantMovements,
} from "@/lib/competition-quadrant";
import type { LeaderboardRow } from "@/lib/leaderboard-data";
import { messages } from "@/lib/i18n/messages";

function row(
  overrides: Partial<LeaderboardRow> & { brandId: string; rank: number }
): LeaderboardRow {
  return {
    id: `snap-${overrides.brandId}`,
    brandName: overrides.brandId.toUpperCase(),
    brandSlug: overrides.brandId,
    parentCompanyName: null,
    score: 50,
    appearanceRate: 0.5,
    avgRank: 3,
    modelCoverage: 0.5,
    ...overrides,
  };
}

/* ---------- P2-1: sorting ---------- */

assert.equal(DEFAULT_SORT_KEY, "score");

// Coverage is Overall-only; engine tabs fall back to the default key.
assert.equal(resolveSortKey("modelCoverage", true), "modelCoverage");
assert.equal(resolveSortKey("modelCoverage", false), "score");
assert.equal(resolveSortKey("avgRank", false), "avgRank");

// Natural directions: avgRank ascending (smaller is better), others descending.
const noFlip = new Set<SortKey>();
assert.equal(isAscendingSort("avgRank", noFlip), true);
assert.equal(isAscendingSort("score", noFlip), false);
assert.equal(isAscendingSort("appearanceRate", noFlip), false);
assert.equal(isAscendingSort("modelCoverage", noFlip), false);

// A second click on the same column flips it; switching columns resets flips.
{
  const first = nextSortState({ sortKey: "score", flipped: noFlip }, "avgRank");
  assert.equal(first.sortKey, "avgRank");
  assert.equal(first.flipped.size, 0);
  assert.equal(isAscendingSort("avgRank", first.flipped), true);

  const flippedOnce = nextSortState(first, "avgRank");
  assert.equal(isAscendingSort("avgRank", flippedOnce.flipped), false);

  const flippedTwice = nextSortState(flippedOnce, "avgRank");
  assert.equal(isAscendingSort("avgRank", flippedTwice.flipped), true);

  const switched = nextSortState(flippedOnce, "score");
  assert.equal(switched.sortKey, "score");
  assert.equal(switched.flipped.size, 0, "switching columns clears flips");
}

const board: LeaderboardRow[] = [
  row({ brandId: "a", rank: 1, score: 90, appearanceRate: 0.9, avgRank: 1.2, modelCoverage: 1 }),
  row({ brandId: "b", rank: 2, score: 80, appearanceRate: 0.4, avgRank: 4.5, modelCoverage: null }),
  row({ brandId: "c", rank: 3, score: 70, appearanceRate: 0.7, avgRank: 2.1, modelCoverage: 0.5 }),
  row({ brandId: "d", rank: 4, score: 70, appearanceRate: 0.2, avgRank: 8.0, modelCoverage: null }),
];

// Default: score descending, ties fall back to published rank (c before d).
assert.deepEqual(
  sortLeaderboardRows(board, "score", false).map((r) => r.brandId),
  ["a", "b", "c", "d"]
);

// avgRank ascending = best average position first.
assert.deepEqual(
  sortLeaderboardRows(board, "avgRank", true).map((r) => r.brandId),
  ["a", "c", "b", "d"]
);

// Appearance descending.
assert.deepEqual(
  sortLeaderboardRows(board, "appearanceRate", false).map((r) => r.brandId),
  ["a", "c", "b", "d"]
);

// Null coverage sinks to the bottom in both directions, keeping rank order.
assert.deepEqual(
  sortLeaderboardRows(board, "modelCoverage", false).map((r) => r.brandId),
  ["a", "c", "b", "d"]
);
assert.deepEqual(
  sortLeaderboardRows(board, "modelCoverage", true).map((r) => r.brandId),
  ["c", "a", "b", "d"]
);

// Sorting must not mutate the input board (published order stays intact).
assert.deepEqual(board.map((r) => r.brandId), ["a", "b", "c", "d"]);

// The `#` column keeps the published rank regardless of sort order.
assert.deepEqual(
  sortLeaderboardRows(board, "avgRank", true).map((r) => r.rank),
  [1, 3, 2, 4]
);

/* ---------- P2-2: compare selection ---------- */

assert.equal(COMPARE_MAX, 3);
assert.equal(canCompare(0), false);
assert.equal(canCompare(1), false, "fewer than 2 cannot compare");
assert.equal(canCompare(2), true);
assert.equal(canCompare(3), true);

{
  let selected: string[] = [];
  selected = toggleCompareSelection(selected, "a");
  selected = toggleCompareSelection(selected, "b");
  selected = toggleCompareSelection(selected, "c");
  assert.deepEqual(selected, ["a", "b", "c"]);

  // A 4th selection is refused.
  const capped = toggleCompareSelection(selected, "d");
  assert.deepEqual(capped, ["a", "b", "c"]);

  // Deselecting still works at the cap, freeing a slot.
  const afterRemove = toggleCompareSelection(selected, "b");
  assert.deepEqual(afterRemove, ["a", "c"]);
  assert.deepEqual(toggleCompareSelection(afterRemove, "d"), ["a", "c", "d"]);
}

// Coverage row is hidden on engine boards.
assert.deepEqual(compareMetricKeys(true), [
  "score",
  "appearanceRate",
  "avgRank",
  "modelCoverage",
]);
assert.deepEqual(compareMetricKeys(false), ["score", "appearanceRate", "avgRank"]);

// Best value: max for score / appearance / coverage, min for avgRank.
{
  const compared = [board[0]!, board[1]!, board[2]!];
  assert.equal(compareBestValue("score", compared), 90);
  assert.equal(compareBestValue("appearanceRate", compared), 0.9);
  assert.equal(compareBestValue("avgRank", compared), 1.2);
  assert.equal(compareBestValue("modelCoverage", compared), 1);

  // All-null metric has no winner to highlight.
  assert.equal(compareBestValue("modelCoverage", [board[1]!, board[3]!]), null);
  assert.equal(compareBestValue("score", []), null);
}

/* ---------- P2-5: movement vs prior period ---------- */

const quadrant = buildCompetitionQuadrant(
  board.map((r) => ({
    brandId: r.brandId,
    brandName: r.brandName,
    brandSlug: r.brandSlug,
    appearanceRate: r.appearanceRate,
    avgRank: r.avgRank,
  }))
);
assert.ok(quadrant);

// No prior published period → no overlay.
assert.deepEqual(selectQuadrantMovements(quadrant!.points, undefined), []);

// Only brands present in both periods, and only when the position changed.
{
  const movements = selectQuadrantMovements(quadrant!.points, {
    a: { appearanceRate: 0.6, avgRank: 2.0 }, // moved
    b: { appearanceRate: 0.4, avgRank: 4.5 }, // identical → skipped
    c: { appearanceRate: 0.7, avgRank: 3.0 }, // avgRank only → moved
    zz: { appearanceRate: 0.1, avgRank: 9 }, // not in this period → ignored
  });
  assert.deepEqual(
    movements.map((mv) => mv.point.brandId),
    ["a", "c"]
  );
  assert.equal(movements[0]!.prev.appearanceRate, 0.6);
  // Every movement keeps its quadrant so the arrow can inherit the colour.
  assert.ok(movements.every((mv) => Boolean(mv.point.quadrant)));
}

// Union scale: prior-period extremes must widen the domain, not fall off-frame.
{
  const prev = { a: { appearanceRate: 0.05, avgRank: 12 } };
  const movements = selectQuadrantMovements(quadrant!.points, prev);
  const freqs = [
    ...quadrant!.points.map((p) => p.appearanceRate),
    ...movements.map((mv) => mv.prev.appearanceRate),
  ];
  const ranks = [
    ...quadrant!.points.map((p) => p.avgRank),
    ...movements.map((mv) => mv.prev.avgRank),
  ];
  assert.equal(Math.min(...freqs), 0.05);
  assert.equal(Math.max(...ranks), 12);
}

/* ---------- P2-3 / P2-4: copy contracts ---------- */

for (const locale of ["en", "zh"] as const) {
  const c = messages[locale].category;
  // Also mentioned lead must carry the on-screen period date.
  assert.ok(c.alsoMentionedLead("2026-08-10").includes("2026-08-10"));
  // Outward quadrant names exist in both locales.
  for (const name of [
    c.quadrantLeaders,
    c.quadrantChallengers,
    c.quadrantNiche,
    c.quadrantLaggards,
  ]) {
    assert.ok(name.length > 0);
  }
  // avgRank / coverage tooltips must spell out their meaning.
  assert.ok(c.tipAvgRank.length > 20, `${locale} avgRank tooltip too thin`);
  assert.ok(c.tipCoverage.length > 20, `${locale} coverage tooltip too thin`);
  assert.ok(c.quadrantPointMetrics("60%", "2.4").includes("60%"));
  assert.ok(c.quadrantPointMetrics("60%", "2.4").includes("2.4"));
  assert.ok(c.compareSelected(2, COMPARE_MAX).includes("2"));
  assert.ok(c.compareSelected(2, COMPARE_MAX).includes(String(COMPARE_MAX)));
  // The at-rest hint must name the gesture, it is the only entry point.
  assert.ok(c.compareHint(COMPARE_MAX).includes(String(COMPARE_MAX)));
  assert.ok(c.compareLead.length > 0, `${locale} compare lead missing`);
}
assert.ok(messages.zh.category.alsoMentionedLead("2026-08-10").startsWith("截止本周期"));

console.log("category-board (P2) fixtures ok");
