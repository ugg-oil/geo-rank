import assert from "node:assert/strict";
import type { LeaderboardRow, LeaderboardView } from "@/lib/leaderboard-data";
import { selectPeriodHighlight } from "@/lib/period-highlight";

function row(
  partial: Pick<LeaderboardRow, "brandId" | "brandName" | "brandSlug" | "rank"> &
    Partial<LeaderboardRow>
): LeaderboardRow {
  return {
    id: partial.brandId,
    score: 50,
    appearanceRate: 0.5,
    avgRank: partial.rank,
    modelCoverage: null,
    ...partial,
  };
}

function view(
  snapshots: LeaderboardRow[],
  prevRanks: Record<string, number>,
  hasPrevWeekData = true
): LeaderboardView {
  return { snapshots, prevRanks, hasPrevWeekData };
}

// No previous period → null
assert.equal(
  selectPeriodHighlight({
    overall: view([row({ brandId: "a", brandName: "A", brandSlug: "a", rank: 1 })], {}, false),
  }),
  null
);

// #1 change wins over larger climb
{
  const h = selectPeriodHighlight({
    overall: view(
      [
        row({ brandId: "new1", brandName: "New One", brandSlug: "new-one", rank: 1 }),
        row({ brandId: "climber", brandName: "Climber", brandSlug: "climber", rank: 3 }),
      ],
      { old1: 1, climber: 10, new1: 5 }
    ),
  });
  assert.equal(h?.kind, "took_first");
  assert.equal(h?.brandSlug, "new-one");
}

// Same #1 → largest climb (spots ≥ 2)
{
  const h = selectPeriodHighlight({
    overall: view(
      [
        row({ brandId: "stay", brandName: "Stay", brandSlug: "stay", rank: 1 }),
        row({ brandId: "up", brandName: "Up", brandSlug: "up", rank: 4 }),
      ],
      { stay: 1, up: 8 }
    ),
  });
  assert.equal(h?.kind, "largest_climb");
  assert.equal(h?.brandSlug, "up");
  assert.equal(h?.spots, 4);
  assert.equal(h?.rank, 4);
}

// Climb spots < 2 skipped
{
  const h = selectPeriodHighlight({
    overall: view(
      [
        row({ brandId: "stay", brandName: "Stay", brandSlug: "stay", rank: 1 }),
        row({ brandId: "tiny", brandName: "Tiny", brandSlug: "tiny", rank: 3 }),
      ],
      { stay: 1, tiny: 4 }
    ),
  });
  assert.equal(h, null);
}

// Climb tie → better rank, then slug
{
  const h = selectPeriodHighlight({
    overall: view(
      [
        row({ brandId: "stay", brandName: "Stay", brandSlug: "stay", rank: 1 }),
        row({ brandId: "b", brandName: "B", brandSlug: "b-brand", rank: 5 }),
        row({ brandId: "a", brandName: "A", brandSlug: "a-brand", rank: 6 }),
      ],
      { stay: 1, b: 10, a: 11 }
    ),
  });
  assert.equal(h?.kind, "largest_climb");
  assert.equal(h?.spots, 5);
  assert.equal(h?.brandSlug, "b-brand");
}

{
  const h = selectPeriodHighlight({
    overall: view(
      [
        row({ brandId: "stay", brandName: "Stay", brandSlug: "stay", rank: 1 }),
        row({ brandId: "z", brandName: "Z", brandSlug: "z-brand", rank: 5 }),
        row({ brandId: "a", brandName: "A", brandSlug: "a-brand", rank: 5 }),
      ],
      { stay: 1, z: 10, a: 10 }
    ),
  });
  assert.equal(h?.kind, "largest_climb");
  assert.equal(h?.brandSlug, "a-brand");
}

// NEW debut — highest (best rank); tie → slug
{
  const h = selectPeriodHighlight({
    overall: view(
      [
        row({ brandId: "stay", brandName: "Stay", brandSlug: "stay", rank: 1 }),
        row({ brandId: "new-low", brandName: "New Low", brandSlug: "new-low", rank: 8 }),
        row({ brandId: "new-hi", brandName: "New Hi", brandSlug: "new-hi", rank: 4 }),
      ],
      { stay: 1, other: 2 }
    ),
  });
  assert.equal(h?.kind, "debut");
  assert.equal(h?.brandSlug, "new-hi");
  assert.equal(h?.rank, 4);
}

{
  const h = selectPeriodHighlight({
    overall: view(
      [
        row({ brandId: "stay", brandName: "Stay", brandSlug: "stay", rank: 1 }),
        row({ brandId: "nb", brandName: "NB", brandSlug: "b-new", rank: 5 }),
        row({ brandId: "na", brandName: "NA", brandSlug: "a-new", rank: 5 }),
      ],
      { stay: 1 }
    ),
  });
  assert.equal(h?.kind, "debut");
  assert.equal(h?.brandSlug, "a-new");
}

// Three rules all false (same #1, no climb ≥2, no NEW)
{
  const h = selectPeriodHighlight({
    overall: view(
      [
        row({ brandId: "stay", brandName: "Stay", brandSlug: "stay", rank: 1 }),
        row({ brandId: "same", brandName: "Same", brandSlug: "same", rank: 2 }),
      ],
      { stay: 1, same: 2 }
    ),
  });
  assert.equal(h, null);
}

// hasBrandPage from set
{
  const h = selectPeriodHighlight({
    overall: view(
      [row({ brandId: "x", brandName: "X", brandSlug: "x", rank: 1 })],
      { y: 1 }
    ),
    hasBrandPageIds: new Set(),
  });
  assert.equal(h?.kind, "took_first");
  assert.equal(h?.hasBrandPage, false);
}

console.log("period-highlight fixtures ok");
