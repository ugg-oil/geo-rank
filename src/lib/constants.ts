export const ENGINES = ["chatgpt", "gemini", "grok"] as const;
export type Engine = (typeof ENGINES)[number];

export const ENGINE_MODEL_SLUGS: Record<Engine, string> = {
  chatgpt: "openai/gpt-4o",
  gemini: "google/gemini-2.5-flash",
  grok: "x-ai/grok-4.5",
};

export const EXTRACTION_MODEL = "openai/gpt-4o-mini";

export const CATEGORIES = [
  "AI Tools",
  "SaaS Software",
  "AI Image / Video Tools",
  "Developer Tools",
  "Marketing Tools",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SCORE_WEIGHTS = {
  overall: { appearance: 0.5, avgRank: 0.4, modelCoverage: 0.1 },
  engine: { appearance: 0.55, avgRank: 0.45 },
};

export const VALID_RESPONSE_THRESHOLD = 0.8;
export const TOP_N = 20;
export const MAX_MENTIONS_PER_RESPONSE = 30;
