import { strict as assert } from "node:assert";
import { assessPublishedManifest } from "@/lib/pipeline-health";
import { CATEGORY_TO_SLUG } from "@/lib/categories";
import {
  canPublishOverall,
  canRetryCategoryEngine,
  coverageExpansionEngines,
  isEngineValid,
  modelCoverageScore,
  selectScoringEngines,
} from "@/lib/engine-scoring";
import {
  inferCollectedEngines,
  inferScoringEngines,
  type CategoryBoardsData,
  type LeaderboardView,
} from "@/lib/leaderboard-data";
import { buildBrandCategoryHistories } from "@/lib/brand-history-data";
import { computeTrendLabel } from "@/lib/brand-trend-label";
import { evaluateLayerB } from "@/lib/brand-layer-b";
import { selectSimilarBrands } from "@/lib/similar-brands";
import {
  buildCompanyPagesFromBrandPages,
  mergeCompanyIndex,
} from "@/lib/company-data";
import type { BrandPageData } from "@/lib/brand-page";
import { parseLeadInput, normalizeWebsite, normalizeSourcePath, isAllowedLeadOrigin } from "@/lib/leads";

const week = "Week of 2026-08-03";
const boards = Object.fromEntries(
  Object.values(CATEGORY_TO_SLUG).map((slug) => [slug, `https://example.test/${slug}.json`])
);

assert.equal(assessPublishedManifest({ week, boards }, week).ok, true);
assert.equal(assessPublishedManifest({ week: "Week of 2026-07-27", boards }, week).ok, false);
assert.equal(assessPublishedManifest({ week, boards: { ...boards, "ai-tools": "" } }, week).ok, false);

assert.equal(isEngineValid({ total: 8, ok: 7 }), true);
assert.equal(isEngineValid({ total: 8, ok: 6 }), false);
assert.equal(isEngineValid({ total: 0, ok: 0 }), false);

assert.deepEqual(
  selectScoringEngines({
    chatgpt: true,
    gemini: true,
    grok: true,
    perplexity: false,
    claude: true,
    deepseek: true,
  }),
  ["chatgpt", "gemini", "grok", "claude", "deepseek"]
);

assert.equal(canPublishOverall(["chatgpt", "gemini", "grok"]), true);
assert.equal(canPublishOverall(["chatgpt", "gemini"]), false);
assert.equal(modelCoverageScore(2, 4), 0.5);
assert.equal(modelCoverageScore(3, 3), 1);
assert.equal(modelCoverageScore(3, 6), 0.5);
assert.deepEqual(
  coverageExpansionEngines(["chatgpt", "gemini", "grok", "perplexity"], ["chatgpt", "gemini", "grok"]),
  ["perplexity"]
);
assert.deepEqual(
  coverageExpansionEngines(["chatgpt", "gemini", "grok"], []),
  []
);

assert.equal(canRetryCategoryEngine(0), true);
assert.equal(canRetryCategoryEngine(1), true);
assert.equal(canRetryCategoryEngine(2), false);
assert.equal(canRetryCategoryEngine(2, { override: true }), true);

const emptyView = (): LeaderboardView => ({ snapshots: [], prevRanks: {}, hasPrevWeekData: false });
const rowView = (): LeaderboardView => ({
  snapshots: [
    {
      id: "1",
      rank: 1,
      brandId: "b1",
      brandName: "ChatGPT",
      brandSlug: "chatgpt",
      score: 80,
      appearanceRate: 0.9,
      avgRank: 1.2,
      modelCoverage: 1,
    },
  ],
  prevRanks: {},
  hasPrevWeekData: false,
});

const legacyWeek: CategoryBoardsData = {
  week: "Week of 2026-07-27",
  boards: {
    overall: rowView(),
    chatgpt: rowView(),
    gemini: rowView(),
    grok: rowView(),
  },
};
assert.deepEqual(inferCollectedEngines(legacyWeek), ["chatgpt", "gemini", "grok"]);
assert.deepEqual(inferScoringEngines(legacyWeek), ["chatgpt", "gemini", "grok"]);

const emptyLegacy: CategoryBoardsData = { week: "Week of 2026-07-20", boards: { overall: emptyView() } };
assert.deepEqual(inferCollectedEngines(emptyLegacy), ["chatgpt", "gemini", "grok"]);

assert.deepEqual(
  buildBrandCategoryHistories("chatgpt", ["Week of 2026-07-27", "Week of 2026-08-03"], {
    "Week of 2026-07-27": {
      "ai-tools": [{ brandSlug: "chatgpt", rank: 1, score: 87.2 }],
    },
    "Week of 2026-08-03": {
      "ai-tools": [{ brandSlug: "chatgpt", rank: 1, score: 85.8 }],
      "saas-software": [{ brandSlug: "slack", rank: 1, score: 70 }],
    },
  }),
  [
    {
      categorySlug: "ai-tools",
      points: [
        { week: "Week of 2026-07-27", weekDate: "2026-07-27", rank: 1, score: 87.2 },
        { week: "Week of 2026-08-03", weekDate: "2026-08-03", rank: 1, score: 85.8 },
      ],
    },
  ]
);

assert.deepEqual(
  buildBrandCategoryHistories("missing", ["Week of 2026-08-03"], {
    "Week of 2026-08-03": { "ai-tools": [{ brandSlug: "chatgpt", rank: 1, score: 85.8 }] },
  }),
  []
);

assert.equal(
  computeTrendLabel([
    { week: "Week of 2026-07-13", weekDate: "2026-07-13", rank: 8, score: 40 },
    { week: "Week of 2026-07-20", weekDate: "2026-07-20", rank: 7, score: 42 },
  ]),
  null
);
assert.equal(
  computeTrendLabel([
    { week: "a", weekDate: "a", rank: 10, score: 1 },
    { week: "b", weekDate: "b", rank: 9, score: 1 },
    { week: "c", weekDate: "c", rank: 5, score: 1 },
  ]),
  "Rising"
);
assert.equal(
  computeTrendLabel([
    { week: "a", weekDate: "a", rank: 2, score: 1 },
    { week: "b", weekDate: "b", rank: 3, score: 1 },
    { week: "c", weekDate: "c", rank: 4, score: 1 },
    { week: "d", weekDate: "d", rank: 8, score: 1 },
  ]),
  "Declining"
);
assert.equal(
  computeTrendLabel([
    { week: "a", weekDate: "a", rank: 3, score: 1 },
    { week: "b", weekDate: "b", rank: 3, score: 1 },
    { week: "c", weekDate: "c", rank: 2, score: 1 },
    { week: "d", weekDate: "d", rank: 3, score: 1 },
  ]),
  "Stable"
);

const similar = selectSimilarBrands(
  "chatgpt",
  {
    snapshots: [
      { brandSlug: "chatgpt", brandName: "ChatGPT", rank: 1, score: 90 },
      { brandSlug: "claude", brandName: "Claude", rank: 2, score: 80 },
      { brandSlug: "gemini", brandName: "Gemini", rank: 3, score: 70 },
      { brandSlug: "far", brandName: "Far", rank: 20, score: 10 },
    ],
  },
  {
    chatgpt: {
      snapshots: [
        { brandSlug: "chatgpt", brandName: "ChatGPT", rank: 1, score: 90 },
        { brandSlug: "claude", brandName: "Claude", rank: 2, score: 80 },
      ],
    },
    gemini: {
      snapshots: [
        { brandSlug: "chatgpt", brandName: "ChatGPT", rank: 1, score: 90 },
        { brandSlug: "gemini", brandName: "Gemini", rank: 2, score: 70 },
      ],
    },
  }
);
assert.deepEqual(
  similar.map((row) => row.slug),
  ["claude", "gemini"]
);

assert.equal(
  evaluateLayerB(
    "chatgpt",
    ["w4", "w3", "w2", "w1"],
    {
      w4: { "ai-tools": [{ brandSlug: "chatgpt" }] },
      w3: { "ai-tools": [{ brandSlug: "chatgpt" }] },
      w2: { "ai-tools": [{ brandSlug: "chatgpt" }] },
      w1: { "ai-tools": [{ brandSlug: "chatgpt" }] },
    }
  ).layerB,
  true
);
assert.equal(
  evaluateLayerB(
    "chatgpt",
    ["w4", "w3", "w2", "w1"],
    {
      w4: { "ai-tools": [{ brandSlug: "chatgpt" }] },
      w3: { "ai-tools": [{ brandSlug: "chatgpt" }] },
      w2: { "ai-tools": [{ brandSlug: "claude" }] },
      w1: { "ai-tools": [{ brandSlug: "chatgpt" }] },
    }
  ).layerB,
  false
);

const companyBrandPages: BrandPageData[] = [
  {
    schemaVersion: 1,
    scoringVersion: 2,
    week,
    slug: "chatgpt",
    name: "ChatGPT",
    parentCompany: "OpenAI",
    updatedAt: "2026-08-05",
    categories: [
      {
        slug: "ai-tools",
        rank: 1,
        score: 85.8,
        mentionFrequency: 0.88,
        engines: { chatgpt: { rank: 1, score: 64.8 } },
      },
    ],
  },
  {
    schemaVersion: 1,
    scoringVersion: 2,
    week,
    slug: "dall-e",
    name: "DALL-E",
    parentCompany: "OpenAI",
    updatedAt: "2026-08-05",
    categories: [
      {
        slug: "ai-image-video-tools",
        rank: 4,
        score: 50,
        mentionFrequency: 0.4,
        engines: {},
      },
    ],
  },
  {
    schemaVersion: 1,
    scoringVersion: 2,
    week,
    slug: "orphan",
    name: "Orphan",
    parentCompany: null,
    updatedAt: "2026-08-05",
    categories: [
      { slug: "ai-tools", rank: 10, score: 20, mentionFrequency: 0.1, engines: {} },
    ],
  },
];

const { companyPages, companyIndex } = buildCompanyPagesFromBrandPages(companyBrandPages, {
  week,
  updatedAt: "2026-08-05",
  scoringVersion: 2,
});
assert.deepEqual(
  companyPages.map((page) => page.slug),
  ["openai"]
);
assert.equal(companyPages[0]!.name, "OpenAI");
assert.deepEqual(
  companyPages[0]!.products.map((product) => product.slug),
  ["chatgpt", "dall-e"]
);
assert.deepEqual(companyPages[0]!.products[0]!.categories[0], {
  slug: "ai-tools",
  rank: 1,
  score: 85.8,
  mentionFrequency: 0.88,
});
assert.equal("totalScore" in companyPages[0]!, false);
assert.deepEqual(companyIndex, { openai: { name: "OpenAI" } });
assert.deepEqual(mergeCompanyIndex(companyIndex, [{ name: "Anthropic" }]), {
  openai: { name: "OpenAI" },
  anthropic: { name: "Anthropic" },
});

assert.equal(parseLeadInput({ companyUrl: "http://spam.test" }).ok, true);
assert.equal(
  (parseLeadInput({ companyUrl: "http://spam.test" }) as { honeypot?: boolean }).honeypot,
  true
);
assert.deepEqual(parseLeadInput({ email: "bad" }), { ok: false, code: "invalid_email" });
assert.deepEqual(
  parseLeadInput({
    email: "a@b.com",
    brandName: "Acme",
    intent: "track_brand",
    consent: false,
  }),
  { ok: false, code: "consent_required" }
);
const leadOk = parseLeadInput({
  email: " A@B.com ",
  brandName: " Acme ",
  intent: "geo_audit",
  consent: true,
  website: "acme.com",
  message: "hi",
  sourcePath: "/brand/acme",
});
assert.equal(leadOk.ok, true);
if (leadOk.ok && !leadOk.honeypot) {
  assert.equal(leadOk.data.email, "a@b.com");
  assert.equal(leadOk.data.brandName, "Acme");
  assert.equal(leadOk.data.intent, "geo_audit");
  assert.equal(leadOk.data.website, "https://acme.com/");
  assert.equal(leadOk.data.sourcePath, "/brand/acme");
}
assert.equal(normalizeWebsite("not a url"), null);
assert.equal(normalizeWebsite("https://"), null);
const leadHttpsPlaceholder = parseLeadInput({
  email: "a@b.com",
  brandName: "Acme",
  intent: "track_brand",
  consent: true,
  website: "https://",
});
assert.equal(leadHttpsPlaceholder.ok, true);
if (leadHttpsPlaceholder.ok && !leadHttpsPlaceholder.honeypot) {
  assert.equal(leadHttpsPlaceholder.data.website, null);
}
assert.equal(normalizeWebsite("https://acme.com"), "https://acme.com/");
assert.equal(normalizeSourcePath("https://evil.test"), "/");
assert.equal(normalizeSourcePath("/brand/x"), "/brand/x");
assert.equal(isAllowedLeadOrigin("http://localhost:3000", "localhost:3000"), true);
assert.equal(isAllowedLeadOrigin("https://evil.test", "localhost:3000"), false);

console.log(
  "Pipeline fixtures passed: engines, brand history, trend, similar, layer B, company, leads."
);
