import assert from "node:assert/strict";
import {
  ALSO_MENTIONED_LIMIT,
  selectAlsoMentioned,
  type PeriodAppearance,
} from "@/lib/also-mentioned";

const top20 = new Set(["b1", "b2"]);

const current: PeriodAppearance[] = [
  { brandId: "b1", appearances: 5, totalResponses: 10 }, // top20 — skip
  { brandId: "out-strong", appearances: 3, totalResponses: 10 },
  { brandId: "out-weak", appearances: 1, totalResponses: 10 },
  { brandId: "out-mid", appearances: 2, totalResponses: 10 },
  { brandId: "ghost", appearances: 0, totalResponses: 10 },
];

const priorByBrand = new Map<string, number>([
  ["out-strong", 1], // cumulative 4
  ["out-weak", 0], // cumulative 1 — below min
  ["out-mid", 1], // cumulative 3
]);

const brandMeta = new Map([
  ["out-strong", { name: "Strong Co", parentCompanyName: null, hasBrandPage: true }],
  ["out-weak", { name: "Weak Co", parentCompanyName: null, hasBrandPage: false }],
  ["out-mid", { name: "Mid Co", parentCompanyName: "Parent", hasBrandPage: false }],
  ["ghost", { name: "Ghost", parentCompanyName: null, hasBrandPage: false }],
]);

const rows = selectAlsoMentioned({
  top20BrandIds: top20,
  current,
  priorByBrand,
  brandMeta,
});

assert.equal(rows.length, 2);
assert.equal(rows[0]!.brandSlug, "strong-co");
assert.equal(rows[0]!.mentionRate, 0.3);
assert.equal(rows[0]!.hasBrandPage, true);
assert.equal(rows[1]!.brandSlug, "mid-co");
assert.equal(rows[1]!.hasBrandPage, false);
assert.ok(!rows.some((r) => r.brandId === "out-weak"));
assert.ok(!rows.some((r) => r.brandId === "b1"));

const many = selectAlsoMentioned({
  top20BrandIds: new Set(),
  current: Array.from({ length: 15 }, (_, i) => ({
    brandId: `x${i}`,
    appearances: 15 - i,
    totalResponses: 20,
  })),
  priorByBrand: new Map(Array.from({ length: 15 }, (_, i) => [`x${i}`, 2] as const)),
  brandMeta: new Map(
    Array.from({ length: 15 }, (_, i) => [
      `x${i}`,
      { name: `Brand ${i}`, parentCompanyName: null, hasBrandPage: false },
    ])
  ),
});
assert.equal(many.length, ALSO_MENTIONED_LIMIT);
assert.ok(many[0]!.mentionRate >= many[many.length - 1]!.mentionRate);

console.log("also-mentioned fixtures ok");
