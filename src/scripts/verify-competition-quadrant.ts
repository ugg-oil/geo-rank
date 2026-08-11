import assert from "node:assert/strict";
import {
  buildCompetitionQuadrant,
  classifyQuadrant,
  DEFAULT_LABEL_LIMIT,
  median,
  selectDefaultLabelIds,
} from "@/lib/competition-quadrant";

assert.equal(median([]), null);
assert.equal(median([3]), 3);
assert.equal(median([1, 3]), 2);
assert.equal(median([1, 2, 3]), 2);
assert.equal(median([4, 1, 3, 2]), 2.5);

{
  const c = classifyQuadrant(0.5, 3, 0.5, 3);
  assert.equal(c.frequency, "high");
  assert.equal(c.position, "high");
  assert.equal(c.quadrant, "high_freq_high_pos");
}
{
  const c = classifyQuadrant(0.49, 3.01, 0.5, 3);
  assert.equal(c.frequency, "lower");
  assert.equal(c.position, "lower");
  assert.equal(c.quadrant, "lower_freq_lower_pos");
}
{
  const c = classifyQuadrant(0.8, 5, 0.5, 3);
  assert.equal(c.quadrant, "high_freq_lower_pos");
}
{
  const c = classifyQuadrant(0.2, 1, 0.5, 3);
  assert.equal(c.quadrant, "lower_freq_high_pos");
}

const sample = [
  {
    brandId: "a",
    brandName: "Alpha",
    brandSlug: "alpha",
    appearanceRate: 0.9,
    avgRank: 1.2,
  },
  {
    brandId: "b",
    brandName: "Beta",
    brandSlug: "beta",
    appearanceRate: 0.8,
    avgRank: 2.0,
  },
  {
    brandId: "c",
    brandName: "Gamma",
    brandSlug: "gamma",
    appearanceRate: 0.4,
    avgRank: 5.0,
  },
  {
    brandId: "d",
    brandName: "Delta",
    brandSlug: "delta",
    appearanceRate: 0.3,
    avgRank: 8.0,
  },
  {
    brandId: "e",
    brandName: "Epsilon",
    brandSlug: "epsilon",
    appearanceRate: 0.55,
    avgRank: 3.5,
  },
  {
    brandId: "f",
    brandName: "Zeta",
    brandSlug: "zeta",
    appearanceRate: 0.5,
    avgRank: 4.0,
  },
];

assert.equal(buildCompetitionQuadrant([]), null);
assert.equal(buildCompetitionQuadrant([sample[0]!]), null);

const model = buildCompetitionQuadrant(sample);
assert.ok(model);
assert.equal(model!.points.length, 6);
assert.equal(model!.medianFrequency, median(sample.map((s) => s.appearanceRate)));
assert.equal(model!.medianAvgRank, median(sample.map((s) => s.avgRank)));

const labeled = model!.points.filter((p) => p.defaultLabel);
assert.ok(labeled.length <= DEFAULT_LABEL_LIMIT);
assert.equal(labeled.length, DEFAULT_LABEL_LIMIT);

// Farthest corners should be preferred over near-median points.
const labelIds = new Set(labeled.map((p) => p.brandId));
assert.ok(labelIds.has("a")); // high freq, high pos extreme
assert.ok(labelIds.has("d")); // low freq, low pos extreme
assert.ok(!labelIds.has("f") || !labelIds.has("e")); // at least one near-median unlabeled

const nearMedianOnly = selectDefaultLabelIds(
  [
    {
      brandId: "near",
      brandSlug: "near",
      appearanceRate: 0.5,
      avgRank: 3,
    },
    {
      brandId: "far",
      brandSlug: "far",
      appearanceRate: 1,
      avgRank: 10,
    },
  ],
  0.5,
  3,
  1
);
assert.deepEqual([...nearMedianOnly], ["far"]);

// Tie-break: same distance → better avgRank → slug
const tied = selectDefaultLabelIds(
  [
    { brandId: "z", brandSlug: "z-brand", appearanceRate: 1, avgRank: 2 },
    { brandId: "y", brandSlug: "y-brand", appearanceRate: 0, avgRank: 2 },
  ],
  0.5,
  2,
  1
);
// both same |dx|, same dy=0 — equal dist; avgRank tie → slug y before z
assert.deepEqual([...tied], ["y"]);

console.log("competition-quadrant fixtures ok");
