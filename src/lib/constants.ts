export const ENGINES = ["chatgpt", "gemini", "grok", "perplexity", "claude", "deepseek"] as const;
export type Engine = (typeof ENGINES)[number];

/** Engines queried this production week. */
export const COLLECTION_ENGINES: readonly Engine[] = ENGINES;

/** Engines allowed into scoring when valid_rate >= threshold. */
export const SCORING_ELIGIBLE_ENGINES: readonly Engine[] = ENGINES;

export const ENGINE_MODEL_SLUGS: Record<Engine, string> = {
  chatgpt: "openai/gpt-4.1-mini:floor",
  gemini: "google/gemini-2.5-flash:floor",
  grok: "x-ai/grok-4.3:floor",
  perplexity: "perplexity/sonar",
  claude: "anthropic/claude-haiku-4.5:floor",
  deepseek: "deepseek/deepseek-v4-flash:floor",
};

export const ENGINE_LABELS: Record<Engine, string> = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  grok: "Grok",
  perplexity: "Perplexity",
  claude: "Claude",
  deepseek: "DeepSeek",
};

export const ENGINE_MODEL_LABELS: Record<Engine, string> = {
  chatgpt: "GPT-4.1 Mini",
  gemini: "2.5 Flash",
  grok: "Grok 4.3",
  perplexity: "Sonar",
  claude: "Haiku 4.5",
  deepseek: "V4 Flash",
};

export function isEngine(value: string): value is Engine {
  return (ENGINES as readonly string[]).includes(value);
}

export function engineLabel(engine: string): string {
  return (ENGINE_LABELS as Record<string, string>)[engine] ?? engine;
}

export function formatEngineList(
  engines: readonly string[] = COLLECTION_ENGINES,
  conjunction: "and" | "or" = "and"
): string {
  const labels = engines.map(engineLabel);
  if (labels.length === 0) return "AI engines";
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) return `${labels[0]} ${conjunction} ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, ${conjunction} ${labels[labels.length - 1]}`;
}

/** v1.2 published weeks had no collectedEngines field. Do not project today's set backward. */
export const LEGACY_COLLECTION_ENGINES = ["chatgpt", "gemini", "grok"] as const;

export const EXTRACTION_MODEL = "openai/gpt-4o-mini:floor";

export const CATEGORIES = [
  "AI Tools",
  "SaaS Software",
  "AI Image / Video Tools",
  "Developer Tools",
  "Marketing Tools",
  "VPN Services",
  "E-commerce Platforms",
  "Online Course Platforms",
  "Language Learning Apps",
  "Password Managers",
  "AI Meeting Assistants",
  "AI Cybersecurity Tools",
  "Recruiting Tools",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SCORE_WEIGHTS = {
  overall: { appearance: 0.5, avgRank: 0.4, modelCoverage: 0.1 },
  engine: { appearance: 0.55, avgRank: 0.45 },
};

export const VALID_RESPONSE_THRESHOLD = 0.8;
export const TOP_N = 20;
export const MAX_MENTIONS_PER_RESPONSE = 30;
export const PROMPTS_PER_CATEGORY = 8;
export const MIN_SCORING_ENGINES_FOR_OVERALL = 3;
export const MAX_CATEGORY_ENGINE_RETRIES = 2;
export const SCORING_VERSION = 2;

export function weeklyPromptCount(engineCount = COLLECTION_ENGINES.length) {
  return engineCount * CATEGORIES.length * PROMPTS_PER_CATEGORY;
}
