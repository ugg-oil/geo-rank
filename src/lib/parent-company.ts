import { normalizeBrandKey } from "@/lib/brand-keys";

/**
 * Curated P0-A preview data. The Company column always uses the recognizable
 * operator name, even when it is close to the product name.
 *
 * This file is staged locally for review; database relations are populated only
 * after the mapping has been approved.
 */
const RAW_PARENT_COMPANIES: Record<string, string> = {
  "dall-e": "OpenAI",
  "dall e": "OpenAI",
  "dall·e": "OpenAI",
  "stable diffusion": "Stability AI",
  "flux.1": "Black Forest Labs",
  "sap leonardo": "SAP",
  photoshop: "Adobe",
  ray2: "Luma AI",
  "deepai text to image api": "DeepAI",
  midjourney: "Midjourney",
  runway: "Runway",
  canva: "Canva",
  "canva magic write": "Canva",
  "canva's magic resize": "Canva",
  ideogram: "Ideogram",
  "pika labs": "Pika",
  synthesia: "Synthesia",
  lumen5: "Lumen5",
  pictory: "Pictory",
  visme: "Visme",
  heygen: "HeyGen",
  artbreeder: "Artbreeder",

  perplexity: "Perplexity AI",
  jasper: "Jasper AI",
  copy: "Copy.ai",
  grammarly: "Grammarly",
  "amazon alexa": "Amazon",
  tensorflow: "Google",
  siri: "Apple",
  "ibm watson": "IBM",
  "semantic scholar": "Allen Institute for AI",
  "amazon web services (aws) ai": "Amazon",
  "google ai": "Google",
  "slack ai": "Salesforce",
  "github copilot": "GitHub",

  bitbucket: "Atlassian",
  podman: "Red Hat",
  "postman cli": "Postman",
  "microsoft visual studio": "Microsoft",
  swagger: "SmartBear",
  "swagger/openapi tools": "SmartBear",
  "github codespaces": "GitHub",
  webstorm: "JetBrains",

  mailchimp: "Intuit",
  "google analytics 360": "Google",
  "hootsuite amplify": "Hootsuite",
  "marketo engage": "Adobe",
  "salesforce marketing cloud (pardot)": "Salesforce",

  slack: "Salesforce",
  trello: "Atlassian",
  "microsoft teams": "Microsoft",
  monday: "monday.com",
  "jira software": "Atlassian",
  quickbooks: "Intuit",
  "zoho crm": "Zoho",
  "sap crm/c4hana": "SAP",
  notion: "Notion Labs",
  // Commercial products with the same public-facing product/company name
  // are kept as owner data, but the table hides the duplicate label.
  docker: "Docker",
  circleci: "CircleCI",
  tabnine: "Tabnine",
  vercel: "Vercel",
  hubspot: "HubSpot",
  activecampaign: "ActiveCampaign",
  ahrefs: "Ahrefs",
  semrush: "Semrush",
  buffer: "Buffer",
  "sprout social": "Sprout Social",
  anyword: "Anyword",
  late: "Late",
  "constant contact": "Constant Contact",
  asana: "Asana",
  chargebee: "Chargebee",
  clickup: "ClickUp",
  zuora: "Zuora",
  outreach: "Outreach",
  freshbooks: "FreshBooks",
  discord: "Discord",
  recurly: "Recurly",
};

const RAW_PRODUCT_DISPLAY_NAMES: Record<string, string> = {
  copy: "Copy.ai",
  "copy ai": "Copy.ai",
  "copy.ai": "Copy.ai",
};

const PARENT_COMPANIES = new Map(
  Object.entries(RAW_PARENT_COMPANIES).map(([product, company]) => [
    normalizeBrandKey(product),
    company,
  ])
);

const PRODUCT_DISPLAY_NAMES = new Map(
  Object.entries(RAW_PRODUCT_DISPLAY_NAMES).map(([product, displayName]) => [
    normalizeBrandKey(product),
    displayName,
  ])
);

export function getProductDisplayName(brandName: string) {
  return PRODUCT_DISPLAY_NAMES.get(normalizeBrandKey(brandName)) ?? brandName;
}

export function getParentCompanyName(brandName: string, storedParentCompany?: string | null) {
  // Curated corrections take precedence over legacy direct-parent data. This
  // keeps the leaderboard on the immediate operating company (e.g. GitHub),
  // rather than an ultimate parent (Microsoft).
  return PARENT_COMPANIES.get(normalizeBrandKey(brandName)) ?? storedParentCompany ?? null;
}

/**
 * Always return the owner explicitly, including when product and company
 * names are identical. The table is an ownership view, so the relationship
 * should remain visible rather than being inferred from a blank cell.
 */
export function getCompanyColumnName(
  brandName: string,
  storedParentCompany?: string | null
) {
  const productName = getProductDisplayName(brandName);
  const ownerName = getParentCompanyName(productName, storedParentCompany);
  return ownerName;
}
