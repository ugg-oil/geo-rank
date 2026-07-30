import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { EXTRACTION_MODEL } from "@/lib/constants";
import { getOpenRouter } from "@/lib/openrouter";
import { preprocessBrand } from "@/pipeline/normalize";
import { preferredCanonicalName } from "@/lib/brand-canonical";
import { applyReviewActions, type ReviewAction } from "@/pipeline/review";

export type ReviewConfidence = "high" | "medium" | "low";

export interface AutoReviewDecision extends ReviewAction {
  confidence: ReviewConfidence;
  reason: string;
}

const IGNORE_TERMS = new Set([
  "ai tool",
  "ai tools",
  "ai platform",
  "ai platforms",
  "platform",
  "platforms",
  "software",
  "solution",
  "solutions",
  "tool",
  "tools",
  "app",
  "apps",
  "service",
  "services",
  "product",
  "products",
  "technology",
  "system",
  "suite",
  "best platform",
  "leading platform",
  "popular tool",
  "top tool",
  "neural engine",
]);

const KNOWN_MERGES: Record<string, string> = {
  "google bard": "Gemini",
  "google gemini": "Gemini",
  "bard": "Gemini",
  "openai gpt": "ChatGPT",
  "openai's gpt": "ChatGPT",
  "gpt-4": "ChatGPT",
  "gpt 4": "ChatGPT",
  "gpt-4o": "ChatGPT",
  "chat gpt": "ChatGPT",
  "evolved chatgpt": "ChatGPT",
  "microsoft copilot": "Microsoft Copilot",
  "microsoft 365 copilot": "Microsoft Copilot",
  "bing image creator": "Microsoft Designer",
  "copy ai": "Copy.ai",
  "midjourney ai": "Midjourney",
  "mid journey": "Midjourney",
  "notion ai": "Notion",
  "github copilot": "GitHub Copilot",
};

const LlmDecisionSchema = z.object({
  decisions: z.array(
    z.object({
      raw_brand: z.string(),
      action: z.enum(["merge", "new", "ignore"]),
      target: z.string().optional(),
      reason: z.string(),
    })
  ),
});

function normalizeKey(value: string): string {
  return preprocessBrand(value).toLowerCase().replace(/['’]/g, "");
}

function stripSuffix(value: string): string {
  return value
    .replace(/\s*(ai|app|apps|tool|tools|platform|suite|pro|studio)$/i, "")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array<number>(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const dist = levenshtein(a, b);
  return 1 - dist / Math.max(a.length, b.length);
}

function findRuleBasedDecision(
  rawBrand: string,
  canonicals: string[]
): AutoReviewDecision | null {
  const key = normalizeKey(rawBrand);
  if (!key) {
    return {
      raw_brand: rawBrand,
      action: "ignore",
      confidence: "high",
      reason: "empty brand",
    };
  }

  if (IGNORE_TERMS.has(key)) {
    return {
      raw_brand: rawBrand,
      action: "ignore",
      confidence: "high",
      reason: "generic term",
    };
  }

  const knownTarget = KNOWN_MERGES[key];
  if (knownTarget) {
    return {
      raw_brand: rawBrand,
      action: "merge",
      target: knownTarget,
      confidence: "high",
      reason: "known alias mapping",
    };
  }

  let best: { target: string; score: number; reason: string } | null = null;
  for (const canonical of canonicals) {
    const canonicalKey = normalizeKey(canonical);
    if (!canonicalKey || canonicalKey === key) continue;

    let score = similarity(key, canonicalKey);
    let reason = "string similarity";

    if (key.includes(canonicalKey) || canonicalKey.includes(key)) {
      score = Math.max(score, 0.9);
      reason = "substring match";
    }

    const strippedKey = stripSuffix(key);
    const strippedCanonical = stripSuffix(canonicalKey);
    if (strippedKey && strippedKey === strippedCanonical) {
      score = Math.max(score, 0.93);
      reason = "suffix-normalized match";
    }

    if (score >= 0.88 && (!best || score > best.score)) {
      best = { target: canonical, score, reason };
    }
  }

  if (best) {
    const target = preferredCanonicalName(best.target);
    return {
      raw_brand: rawBrand,
      action: "merge",
      target,
      confidence: best.score >= 0.93 ? "high" : "medium",
      reason: `${best.reason} (${best.score.toFixed(2)})`,
    };
  }

  return null;
}

async function classifyWithLlm(
  items: { raw_brand: string; count: number }[],
  canonicals: string[]
): Promise<AutoReviewDecision[]> {
  if (items.length === 0) return [];

  const completion = await getOpenRouter().chat.completions.create({
    model: EXTRACTION_MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Classify brand review queue items. Return JSON only. Prefer merge when clearly same product with different naming. Use ignore only for generic non-product terms.",
      },
      {
        role: "user",
        content: JSON.stringify({
          canonical_brands: canonicals.slice(0, 200),
          items,
          output_format: {
            decisions: [
              {
                raw_brand: "Jasper AI",
                action: "merge",
                target: "Jasper",
                reason: "same product alias",
              },
            ],
          },
        }),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = LlmDecisionSchema.parse(JSON.parse(raw));

  return parsed.decisions.map((d) => ({
    raw_brand: d.raw_brand,
    action: d.action,
    target: d.target,
    confidence: "medium" as const,
    reason: `llm: ${d.reason}`,
  }));
}

export interface AutoReviewOptions {
  week: string;
  apply?: boolean;
  useLlm?: boolean;
  minConfidence?: ReviewConfidence;
  minCount?: number;
  batchSize?: number;
}

const CONFIDENCE_RANK: Record<ReviewConfidence, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export async function autoReviewWeek(options: AutoReviewOptions) {
  const {
    week,
    apply = false,
    useLlm = false,
    minConfidence = "high",
    minCount = 1,
    batchSize = 25,
  } = options;

  const pending = await prisma.brandReviewQueue.findMany({
    where: { week, status: "pending" },
    orderBy: { count: "desc" },
  });

  const brands = await prisma.brand.findMany({ select: { canonicalName: true } });
  const canonicals = brands.map((b) => b.canonicalName);

  const decisions: AutoReviewDecision[] = [];
  const deferred: string[] = [];
  const unresolved: { raw_brand: string; count: number }[] = [];

  for (const item of pending) {
    if (item.count < minCount) {
      deferred.push(item.rawBrand);
      continue;
    }

    const ruleDecision = findRuleBasedDecision(item.rawBrand, canonicals);
    if (ruleDecision) {
      decisions.push(ruleDecision);
      continue;
    }

    unresolved.push({ raw_brand: item.rawBrand, count: item.count });
  }

  if (useLlm && unresolved.length > 0) {
    for (let i = 0; i < unresolved.length; i += batchSize) {
      const batch = unresolved.slice(i, i + batchSize);
      const llmDecisions = await classifyWithLlm(batch, canonicals);
      const llmMap = new Map(llmDecisions.map((d) => [d.raw_brand, d]));
      for (const item of batch) {
        const decision = llmMap.get(item.raw_brand);
        if (decision) {
          decisions.push(decision);
        } else {
          decisions.push({
            raw_brand: item.raw_brand,
            action: "new",
            confidence: "low",
            reason: "llm missing item; left for manual review",
          });
        }
      }
    }
  } else {
    for (const item of unresolved) {
      decisions.push({
        raw_brand: item.raw_brand,
        action: "new",
        confidence: "high",
        reason: "unique product name",
      });
    }
  }

  const threshold = CONFIDENCE_RANK[minConfidence];
  const toApply = decisions.filter(
    (d) => CONFIDENCE_RANK[d.confidence] >= threshold && d.confidence !== "low"
  );
  const skipped = decisions.filter(
    (d) => CONFIDENCE_RANK[d.confidence] < threshold || d.confidence === "low"
  );

  const outDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "review-auto.json");
  fs.writeFileSync(outPath, JSON.stringify(decisions, null, 2));

  const summary = {
    week,
    pending: pending.length,
    decided: decisions.length,
    deferred: deferred.length,
    toApply: toApply.length,
    skipped: skipped.length,
    byAction: {
      merge: decisions.filter((d) => d.action === "merge").length,
      new: decisions.filter((d) => d.action === "new").length,
      ignore: decisions.filter((d) => d.action === "ignore").length,
    },
    output: outPath,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (apply && toApply.length > 0) {
    const processed = await applyReviewActions(
      toApply.map(({ raw_brand, action, target }) => ({
        raw_brand,
        action,
        target,
      }))
    );
    console.log(`Applied ${processed} auto-review actions`);
  }

  return { summary, decisions, toApply, skipped, deferred };
}
