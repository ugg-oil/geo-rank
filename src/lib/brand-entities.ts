import { normalizeBrandKey } from "@/lib/brand-keys";

export const ENTITY_TYPES = [
  "product",
  "company",
  "platform",
  "feature",
  "model",
  "unknown",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export interface EntityRule {
  type: EntityType;
  rankingEnabled: boolean;
  /** Parent company/platform canonical name (for analytics) */
  parent?: string;
}

/**
 * Explicit entity classification. Keys are normalized brand names.
 * Unlisted brands default to product + rankingEnabled=true until reviewed.
 */
const RAW_ENTITY_RULES: Record<string, EntityRule> = {
  // --- Companies (track mentions, exclude from ranking) ---
  google: { type: "company", rankingEnabled: false },
  microsoft: { type: "company", rankingEnabled: false },
  openai: { type: "company", rankingEnabled: false },
  anthropic: { type: "company", rankingEnabled: false },
  amazon: { type: "company", rankingEnabled: false },
  apple: { type: "company", rankingEnabled: false },
  meta: { type: "company", rankingEnabled: false },
  ibm: { type: "company", rankingEnabled: false },
  xai: { type: "company", rankingEnabled: false },
  adobe: { type: "company", rankingEnabled: false },
  "black forest labs": { type: "company", rankingEnabled: false },
  "stability ai": { type: "company", rankingEnabled: false },
  github: { type: "company", rankingEnabled: false, parent: "Microsoft" },
  sap: { type: "company", rankingEnabled: false },
  oracle: { type: "company", rankingEnabled: false },
  salesforce: { type: "product", rankingEnabled: true },
  "google ai": { type: "platform", rankingEnabled: false, parent: "Google" },
  "amazon web services (aws) ai": {
    type: "platform",
    rankingEnabled: false,
    parent: "Amazon",
  },
  "power automate": { type: "product", rankingEnabled: true, parent: "Microsoft" },

  // --- Platforms / cloud (not consumer-facing products in GEO sense) ---
  "google cloud": { type: "platform", rankingEnabled: false, parent: "Google" },
  "microsoft azure": { type: "platform", rankingEnabled: false, parent: "Microsoft" },
  azure: { type: "platform", rankingEnabled: false, parent: "Microsoft" },
  aws: { type: "platform", rankingEnabled: false, parent: "Amazon" },

  // --- Features / bundles (not standalone ranked products) ---
  "gmail smart compose": {
    type: "feature",
    rankingEnabled: false,
    parent: "Google",
  },
  "google workspace": {
    type: "platform",
    rankingEnabled: false,
    parent: "Google",
  },
  "zoom ai companion": {
    type: "feature",
    rankingEnabled: false,
    parent: "Zoom",
  },
  "apple siri": { type: "feature", rankingEnabled: false, parent: "Apple" },

  // --- AI products (ranking enabled) ---
  chatgpt: { type: "product", rankingEnabled: true, parent: "OpenAI" },
  gemini: { type: "product", rankingEnabled: true, parent: "Google" },
  claude: { type: "product", rankingEnabled: true, parent: "Anthropic" },
  grok: { type: "product", rankingEnabled: true, parent: "xAI" },
  perplexity: { type: "product", rankingEnabled: true },
  "microsoft copilot": {
    type: "product",
    rankingEnabled: true,
    parent: "Microsoft",
  },
  "github copilot": {
    type: "product",
    rankingEnabled: true,
    parent: "GitHub",
  },
  "copilot studio": {
    type: "product",
    rankingEnabled: true,
    parent: "Microsoft",
  },
  cursor: { type: "product", rankingEnabled: true },
  replit: { type: "product", rankingEnabled: true },
  midjourney: { type: "product", rankingEnabled: true },
  "stable diffusion": { type: "product", rankingEnabled: true },
  "adobe firefly": { type: "product", rankingEnabled: true, parent: "Adobe" },
  runway: { type: "product", rankingEnabled: true },
  notion: { type: "product", rankingEnabled: true },
  slack: { type: "product", rankingEnabled: true },
  asana: { type: "product", rankingEnabled: true },
  trello: { type: "product", rankingEnabled: true },
  jira: { type: "product", rankingEnabled: true },
  "jira software": { type: "product", rankingEnabled: true },
  hubspot: { type: "product", rankingEnabled: true },
  mailchimp: { type: "product", rankingEnabled: true },
  semrush: { type: "product", rankingEnabled: true },
  ahrefs: { type: "product", rankingEnabled: true },

  // --- Developer tools (distinct products, do not merge) ---
  "jetbrains intellij idea": {
    type: "product",
    rankingEnabled: true,
    parent: "JetBrains",
  },
  pycharm: { type: "product", rankingEnabled: true, parent: "JetBrains" },
  "jetbrains ai": { type: "product", rankingEnabled: true, parent: "JetBrains" },
  docker: { type: "product", rankingEnabled: true },
  jenkins: { type: "product", rankingEnabled: true },
  postman: { type: "product", rankingEnabled: true },
  "visual studio code": { type: "product", rankingEnabled: true, parent: "Microsoft" },
  "visual studio": { type: "product", rankingEnabled: true, parent: "Microsoft" },

  // --- Models (subset of product; rank if explicitly a product line) ---
  "gpt-4": { type: "model", rankingEnabled: false, parent: "ChatGPT" },
  "gpt-4o": { type: "model", rankingEnabled: false, parent: "ChatGPT" },
};

export const ENTITY_RULES: Record<string, EntityRule> = Object.fromEntries(
  Object.entries(RAW_ENTITY_RULES).map(([k, v]) => [normalizeBrandKey(k), v])
);

export function classifyEntity(canonicalName: string): EntityRule {
  return (
    ENTITY_RULES[normalizeBrandKey(canonicalName)] ?? {
      type: "product",
      rankingEnabled: true,
    }
  );
}

export function isRankingEligible(entityType: EntityType, rankingEnabled: boolean): boolean {
  return rankingEnabled && entityType === "product";
}
