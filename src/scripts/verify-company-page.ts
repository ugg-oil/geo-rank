/**
 * Phase 5 P4: company page sort / summary / Δ helpers.
 * Run: npx tsx src/scripts/verify-company-page.ts
 */
import assert from "node:assert/strict";
import type { CompanyProductEntry } from "@/lib/company-page";
import {
  buildCompanySummary,
  buildPrevRankLookup,
  categoryRankDelta,
  enrichProductsWithPreviousRanks,
  primaryCategory,
  sortCompanyProducts,
} from "@/lib/company-page-view";

const names: Record<string, string> = {
  "ai-tools": "AI Tools",
  "crm-platforms": "CRM Platforms",
  "cloud-storage": "Cloud Storage",
};
const categoryNameOf = (slug: string) => names[slug] ?? slug;

const products: CompanyProductEntry[] = [
  {
    slug: "beta",
    name: "Beta",
    categories: [
      { slug: "crm-platforms", rank: 5, score: 60, mentionFrequency: 0.5, previousRank: 8 },
    ],
  },
  {
    slug: "alpha",
    name: "Alpha",
    categories: [
      { slug: "ai-tools", rank: 2, score: 80, mentionFrequency: 0.7, previousRank: 2 },
      { slug: "cloud-storage", rank: 10, score: 40, mentionFrequency: 0.2 },
    ],
  },
  {
    slug: "gamma",
    name: "Gamma",
    categories: [
      { slug: "cloud-storage", rank: 3, score: 90, mentionFrequency: 0.9, previousRank: 6 },
    ],
  },
];

// primaryCategory: best rank, slug tiebreak
assert.equal(primaryCategory(products[1]!)!.slug, "ai-tools");

// sort by rank (best rank asc)
assert.deepEqual(
  sortCompanyProducts(products, "rank", categoryNameOf).map((p) => p.slug),
  ["alpha", "gamma", "beta"]
);

// sort by score (best score desc)
assert.deepEqual(
  sortCompanyProducts(products, "score", categoryNameOf).map((p) => p.slug),
  ["gamma", "alpha", "beta"]
);

// sort by category name of primary
assert.deepEqual(
  sortCompanyProducts(products, "category", categoryNameOf).map((p) => p.slug),
  ["alpha", "gamma", "beta"]
);

// pin from brand
assert.deepEqual(
  sortCompanyProducts(products, "rank", categoryNameOf, "beta").map((p) => p.slug),
  ["beta", "alpha", "gamma"]
);

// summary
const summary = buildCompanySummary(products, true);
assert.ok(summary);
assert.equal(summary!.productCount, 3);
assert.equal(summary!.categoryCount, 3);
assert.equal(summary!.bestProduct.slug, "alpha");
assert.equal(summary!.bestProduct.rank, 2);
assert.ok(summary!.biggestRiser);
assert.equal(summary!.biggestRiser!.slug, "gamma");
assert.equal(summary!.biggestRiser!.spots, 3);

assert.equal(buildCompanySummary([], true), null);

// deltas
assert.equal(
  categoryRankDelta(products[0]!.categories[0]!, "beta", true).kind,
  "up"
);
assert.equal(
  categoryRankDelta(products[1]!.categories[0]!, "alpha", true).kind,
  "same"
);
assert.equal(
  categoryRankDelta(products[1]!.categories[1]!, "alpha", true).kind,
  "new"
);
assert.equal(
  categoryRankDelta(products[0]!.categories[0]!, "beta", false).kind,
  "none"
);

// enrich previous ranks
const prevLookup = buildPrevRankLookup([
  {
    slug: "alpha",
    name: "Alpha",
    categories: [{ slug: "ai-tools", rank: 4, score: 70, mentionFrequency: 0.6 }],
  },
]);
const enriched = enrichProductsWithPreviousRanks(
  [
    {
      slug: "alpha",
      name: "Alpha",
      categories: [
        { slug: "ai-tools", rank: 2, score: 80, mentionFrequency: 0.7 },
        { slug: "crm-platforms", rank: 5, score: 50, mentionFrequency: 0.4 },
      ],
    },
  ],
  prevLookup
);
assert.equal(enriched[0]!.categories[0]!.previousRank, 4);
assert.equal(enriched[0]!.categories[1]!.previousRank, undefined);

console.log("Company page helpers passed: sort, pin, summary, delta, enrich.");
