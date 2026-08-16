import assert from "node:assert/strict";
import { buildWhyCards, filterHistoryByRange } from "@/lib/brand-why";
import type { BrandHistoryPoint } from "@/lib/brand-history-data";

const collected = ["chatgpt", "gemini", "grok", "perplexity", "claude"] as const;

function point(week: string, rank: number, score = 50): BrandHistoryPoint {
  return { week: `Week of ${week}`, weekDate: week, rank, score };
}

// Close engines → no hard split
{
  const cards = buildWhyCards({
    overallRank: 5,
    engines: {
      chatgpt: { rank: 4, score: 60 },
      gemini: { rank: 5, score: 55 },
      grok: { rank: 6, score: 50 },
      perplexity: { rank: 5, score: 52 },
      claude: { rank: 4, score: 58 },
    },
    collectedEngines: collected,
    history: [point("2026-07-13", 8), point("2026-07-27", 6), point("2026-08-10", 5)],
  });
  assert.equal(cards.enginesClose, true);
  assert.equal(cards.strengths.length, 0);
  assert.equal(cards.weaknesses.length, 0);
  assert.equal(cards.trend, "Rising");
}

// Strengths = best 1–2; weaknesses = absent + worst
{
  const cards = buildWhyCards({
    overallRank: 8,
    engines: {
      chatgpt: { rank: 2, score: 80 },
      gemini: { rank: 3, score: 75 },
      grok: { rank: 15, score: 20 },
      perplexity: { rank: 14, score: 22 },
    },
    collectedEngines: collected,
    history: [],
  });
  assert.equal(cards.enginesClose, false);
  assert.ok(cards.strengths.some((s) => s.engine === "chatgpt" && s.reason === "best"));
  assert.ok(cards.strengths.some((s) => s.engine === "gemini"));
  assert.ok(cards.weaknesses.some((w) => w.kind === "absent" && w.engine === "claude"));
  assert.ok(cards.weaknesses.some((w) => w.kind === "weak" && w.engine === "grok"));
  assert.equal(cards.trend, null);
}

// Beats overall ≥2 counts as strength (beyond top-2 best)
{
  const cards = buildWhyCards({
    overallRank: 10,
    engines: {
      chatgpt: { rank: 2, score: 80 },
      gemini: { rank: 3, score: 75 },
      grok: { rank: 15, score: 20 },
      perplexity: { rank: 7, score: 55 },
      claude: { rank: 14, score: 25 },
    },
    collectedEngines: collected,
    history: [point("2026-07-13", 10), point("2026-07-27", 10), point("2026-08-10", 10)],
  });
  assert.ok(cards.strengths.some((s) => s.engine === "chatgpt" && s.reason === "best"));
  assert.ok(
    cards.strengths.some((s) => s.engine === "perplexity" && s.reason === "beats_overall")
  );
  assert.equal(cards.trend, "Stable");
}

// History range filter + clamp
{
  const points = [
    point("2026-06-29", 12),
    point("2026-07-13", 10),
    point("2026-07-27", 8),
    point("2026-08-10", 7),
  ];
  const mid = filterHistoryByRange(points, "2026-07-13", "2026-07-27");
  assert.deepEqual(
    mid.map((p) => p.weekDate),
    ["2026-07-13", "2026-07-27"]
  );
  const swapped = filterHistoryByRange(points, "2026-08-10", "2026-07-13");
  assert.equal(swapped.length, 3);
  assert.equal(filterHistoryByRange(points, "2026-09-01", "2026-09-15").length, 0);
}

console.log("verify-brand-why: ok");
