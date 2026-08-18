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
  cursor: { type: "product", rankingEnabled: true, parent: "Anysphere" },
  replit: { type: "product", rankingEnabled: true },
  midjourney: { type: "product", rankingEnabled: true },
  "stable diffusion": { type: "product", rankingEnabled: true },
  "adobe firefly": { type: "product", rankingEnabled: true, parent: "Adobe" },
  runway: { type: "product", rankingEnabled: true },
  "dall·e": { type: "product", rankingEnabled: true, parent: "OpenAI" },
  "dall-e": { type: "product", rankingEnabled: true, parent: "OpenAI" },
  "leonardo.ai": { type: "product", rankingEnabled: true },
  leonardo: { type: "product", rankingEnabled: true },
  "sap leonardo": { type: "platform", rankingEnabled: false, parent: "SAP" },
  synthesys: { type: "product", rankingEnabled: true },
  notion: { type: "product", rankingEnabled: true },
  slack: { type: "product", rankingEnabled: true },
  asana: { type: "product", rankingEnabled: true },
  trello: { type: "product", rankingEnabled: true },
  jira: { type: "product", rankingEnabled: true },
  "jira software": { type: "product", rankingEnabled: true },
  hubspot: { type: "product", rankingEnabled: true },
  "duolingo max": { type: "product", rankingEnabled: true, parent: "Duolingo" },
  "super duolingo": { type: "product", rankingEnabled: true, parent: "Duolingo" },
  "babbel live": { type: "product", rankingEnabled: true, parent: "Babbel" },
  "babbel live 3.0": { type: "product", rankingEnabled: true, parent: "Babbel" },
  "babbel live+": { type: "product", rankingEnabled: true, parent: "Babbel" },
  "memrise 4.0": { type: "product", rankingEnabled: true, parent: "Memrise" },
  ankidroid: { type: "product", rankingEnabled: true, parent: "Anki" },
  ankimobile: { type: "product", rankingEnabled: true, parent: "Anki" },
  "fluentu 2.0": { type: "product", rankingEnabled: true, parent: "FluentU" },
  "chatgpt voice": { type: "product", rankingEnabled: true, parent: "OpenAI" },
  mailchimp: { type: "product", rankingEnabled: true },
  semrush: { type: "product", rankingEnabled: true },
  ahrefs: { type: "product", rankingEnabled: true },

  // --- SKUs → product / operator (parent Brand must already exist) ---
  // Version strings must not rank separately — preferredCanonical merges them.
  "midjourney v5": { type: "model", rankingEnabled: false, parent: "Midjourney" },
  "midjourney v6": { type: "model", rankingEnabled: false, parent: "Midjourney" },
  "midjourney v7": { type: "model", rankingEnabled: false, parent: "Midjourney" },
  "runway gen-2": { type: "model", rankingEnabled: false, parent: "Runway" },
  "runway gen-3": { type: "model", rankingEnabled: false, parent: "Runway" },
  "runway gen-3 alpha": { type: "model", rankingEnabled: false, parent: "Runway" },
  "synthesys ai studio": { type: "model", rankingEnabled: false, parent: "Synthesys" },
  "otter.ai pro max": { type: "model", rankingEnabled: false, parent: "Otter" },
  "fireflies.ai 3.0": { type: "model", rankingEnabled: false, parent: "Fireflies" },
  "notion ai meetings": { type: "model", rankingEnabled: false, parent: "Notion" },
  "shopify plus": { type: "model", rankingEnabled: false, parent: "Shopify" },
  "shopify/shopify plus": { type: "model", rankingEnabled: false, parent: "Shopify" },
  "shopify v2": { type: "model", rankingEnabled: false, parent: "Shopify" },
  "shopify payments": { type: "model", rankingEnabled: false, parent: "Shopify" },
  "shopify magic": { type: "model", rankingEnabled: false, parent: "Shopify" },
  "shopify magic ai": { type: "model", rankingEnabled: false, parent: "Shopify" },
  "shopify b2b": { type: "model", rankingEnabled: false, parent: "Shopify" },
  "fin ai 3.0": { type: "model", rankingEnabled: false, parent: "Fin" },
  "runway ml": { type: "model", rankingEnabled: false, parent: "Runway" },
  "adobe commerce (magento)": {
    type: "product",
    rankingEnabled: true,
    parent: "Adobe Commerce",
  },
  "magento (adobe commerce)": {
    type: "product",
    rankingEnabled: true,
    parent: "Adobe Commerce",
  },
  "linkedin jobs": { type: "product", rankingEnabled: true, parent: "LinkedIn" },
  "workday recruiting": { type: "product", rankingEnabled: true, parent: "Workday" },
  "sales hub": { type: "model", rankingEnabled: false, parent: "HubSpot" },
  "service hub": { type: "model", rankingEnabled: false, parent: "HubSpot" },
  "vs code": { type: "product", rankingEnabled: true, parent: "Microsoft" },
  "github copilot workspace": {
    type: "product",
    rankingEnabled: true,
    parent: "GitHub Copilot",
  },
  "swagger (openapi)": { type: "product", rankingEnabled: true, parent: "Swagger" },
  openapi: { type: "product", rankingEnabled: true, parent: "Swagger" },
  "crowdstrike falcon insight xdr": {
    type: "model",
    rankingEnabled: false,
    parent: "CrowdStrike Falcon",
  },
  "crowdstrike falcon / charlotte ai": {
    type: "model",
    rankingEnabled: false,
    parent: "CrowdStrike Falcon",
  },
  "falcon platform": {
    type: "model",
    rankingEnabled: false,
    parent: "CrowdStrike Falcon",
  },
  "crowdstrike charlotte ai / falcon next-gen siem": {
    type: "model",
    rankingEnabled: false,
    parent: "CrowdStrike Falcon",
  },
  "proofpoint tap": {
    type: "model",
    rankingEnabled: false,
    parent: "Proofpoint Essentials",
  },

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
  "gpt image": { type: "model", rankingEnabled: false, parent: "DALL·E" },
  "gpt image 2": { type: "model", rankingEnabled: false, parent: "DALL·E" },
  "chatgpt / gpt image": { type: "model", rankingEnabled: false, parent: "DALL·E" },
  "chatgpt / gpt image 2": { type: "model", rankingEnabled: false, parent: "DALL·E" },
  "chatgpt / gpt-4o or gpt image": {
    type: "model",
    rankingEnabled: false,
    parent: "DALL·E",
  },
  "nano banana": { type: "model", rankingEnabled: false, parent: "Gemini" },
  "nano banana 2": { type: "model", rankingEnabled: false, parent: "Gemini" },
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
