import { normalizeBrandKey } from "@/lib/brand-keys";
import { toBrandSlug } from "@/lib/brand-slug";

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

  duolingo: "Duolingo",
  "duolingo max": "Duolingo",
  "super duolingo": "Duolingo",
  babbel: "Babbel",
  "babbel live": "Babbel",
  "babbel live 3.0": "Babbel",
  "babbel live+": "Babbel",
  busuu: "Busuu",
  memrise: "Memrise",
  "memrise 4.0": "Memrise",
  pimsleur: "Simon & Schuster",
  "rosetta stone": "IXL Learning",
  hellotalk: "HelloTalk",
  tandem: "Tandem",
  lingodeer: "LingoDeer",
  lingq: "LingQ",
  italki: "italki",
  drops: "Kahoot",
  mondly: "Pearson",
  clozemaster: "Clozemaster",
  anki: "Anki",
  ankidroid: "Anki",
  ankimobile: "Anki",
  preply: "Preply",
  brainscape: "Brainscape",
  fluentu: "FluentU",
  "fluentu 2.0": "FluentU",
  speechling: "Speechling",
  talkpal: "Talkpal",
  speak: "Speak",
  immerse: "Immerse",

  // VPN — product ≠ operator
  nordvpn: "Nord Security",
  nordlayer: "Nord Security",
  surfshark: "Nord Security",
  expressvpn: "Kape Technologies",
  cyberghost: "Kape Technologies",
  "private internet access": "Kape Technologies",
  "proton vpn": "Proton",
  "mozilla vpn": "Mozilla",
  "perimeter 81": "Check Point",
  "cloudflare warp": "Cloudflare",
  "norton vpn": "Gen Digital",
  "hotspot shield": "Aura",
  ipvanish: "Ziff Davis",

  // Password managers
  nordpass: "Nord Security",
  "proton pass": "Proton",
  "apple icloud keychain": "Apple",
  "google password manager": "Google",
  "zoho vault": "Zoho",
  yubikey: "Yubico",
  "norton password manager": "Gen Digital",
  "azure ad": "Microsoft",
  chrome: "Google",
  keeper: "Keeper Security",

  // Ecommerce
  woocommerce: "Automattic",
  "salesforce commerce cloud": "Salesforce",
  "adobe commerce": "Adobe",
  "adobe commerce (magento)": "Adobe",
  "magento (adobe commerce)": "Adobe",
  "wix ecommerce": "Wix",
  square: "Block",
  "squarespace commerce": "Squarespace",
  "shopify/shopify plus": "Shopify",
  "shopify plus": "Shopify",
  "shopify v2": "Shopify",
  "shopify payments": "Shopify",
  "shopify magic": "Shopify",
  "shopify magic ai": "Shopify",
  "shopify b2b": "Shopify",

  // Online courses
  edx: "2U",
  linkedin: "Microsoft",
  udacity: "Accenture",
  "canvas lms": "Instructure",
  "blackboard learn ultra": "Anthology",
  codecademy: "Skillsoft",
  futurelearn: "SEEK",

  // Recruiting
  indeed: "Recruit Holdings",
  glassdoor: "Recruit Holdings",
  "linkedin jobs": "Microsoft",
  "workday recruiting": "Workday",
  "sap successfactors recruiting": "SAP",
  "oracle taleo / oracle recruiting cloud": "Oracle",

  // AI cybersecurity
  "crowdstrike falcon": "CrowdStrike",
  "crowdstrike falcon insight xdr": "CrowdStrike",
  "crowdstrike falcon / charlotte ai": "CrowdStrike",
  "falcon platform": "CrowdStrike",
  "crowdstrike charlotte ai / falcon next-gen siem": "CrowdStrike",
  "microsoft security": "Microsoft",
  "microsoft defender xdr": "Microsoft",
  "microsoft sentinel": "Microsoft",
  "microsoft defender for endpoint/xdr": "Microsoft",
  "palo alto cortex xsiam / cortex agentix": "Palo Alto Networks",
  "palo alto networks cortex xdr": "Palo Alto Networks",
  "proofpoint essentials": "Proofpoint",
  "proofpoint tap": "Proofpoint",
  "sentinelone singularity xdr": "SentinelOne",
  "torq ai soc platform": "Torq",

  // AI image / video SKUs
  "midjourney v6": "Midjourney",
  "chatgpt / gpt image 2": "OpenAI",
  "chatgpt / gpt image": "OpenAI",
  "chatgpt / gpt-4o or gpt image": "OpenAI",
  "runway gen-3 alpha": "Runway",
  luma: "Luma AI",

  // Meeting assistants
  otter: "Otter.ai",
  "otter.ai pro max": "Otter.ai",
  fireflies: "Fireflies.ai",
  "fireflies.ai 3.0": "Fireflies.ai",
  "notion ai meetings": "Notion Labs",
  "microsoft office": "Microsoft",
  "microsoft copilot for meetings": "Microsoft",

  // AI tools
  "google ai studio": "Google",
  "hugging face transformers": "Hugging Face",
  "apple intelligence pro": "Apple",
  "google workspace gemini": "Google",
  "miro ai": "Miro",
  "dall-e mini": "Craiyon",
  dialogflow: "Google",

  // Developer tools
  cursor: "Anysphere",
  openapi: "SmartBear",
  "swagger (openapi)": "SmartBear",
  "vs code": "Microsoft",
  soapui: "SmartBear",
  "github copilot workspace": "GitHub",
  "git/github": "GitHub",

  // SaaS SKUs
  "sales hub": "HubSpot",
  "service hub": "HubSpot",
  "stripe billing": "Stripe",
  "oracle netsuite": "Oracle",
  "sage intacct": "Sage",
  "microsoft 365 / office 365": "Microsoft",
  dynamics: "Microsoft",

  // Same public product / company name (P0-A still shows Company column)
  shopify: "Shopify",
  bigcommerce: "BigCommerce",
  etsy: "Etsy",
  prestashop: "PrestaShop",
  commercetools: "commercetools",
  "1password": "1Password",
  bitwarden: "Bitwarden",
  dashlane: "Dashlane",
  lastpass: "LastPass",
  roboform: "RoboForm",
  keepass: "KeePass",
  keepassxc: "KeePassXC",
  enpass: "Enpass",
  okta: "Okta",
  psono: "Psono",
  "mullvad vpn": "Mullvad",
  ivpn: "IVPN",
  windscribe: "Windscribe",
  "hide.me": "Hide.me",
  twingate: "Twingate",
  vyprvpn: "Golden Frog",
  tailscale: "Tailscale",
  coursera: "Coursera",
  udemy: "Udemy",
  skillshare: "Skillshare",
  pluralsight: "Pluralsight",
  maven: "Maven",
  teachable: "Teachable",
  masterclass: "MasterClass",
  thinkific: "Thinkific",
  datacamp: "DataCamp",
  "khan academy": "Khan Academy",
  kajabi: "Kajabi",
  "circle.so": "Circle",
  greenhouse: "Employ",
  lever: "Employ",
  ziprecruiter: "ZipRecruiter",
  smartrecruiters: "SmartRecruiters",
  workable: "Workable",
  ashby: "Ashby",
  icims: "iCIMS",
  jazzhr: "JazzHR",
  "breezy hr": "Breezy HR",
  "paradox (olivia)": "Paradox",
  seekout: "SeekOut",
  gem: "Gem",
  darktrace: "Darktrace",
  "vectra ai": "Vectra",
  fathom: "Fathom",
  grain: "Grain",
  avoma: "Avoma",
  "sembly ai": "Sembly",
  "tl;dv": "tl;dv",
  rev: "Rev",
  gong: "Gong",
  tactiq: "Tactiq",
  salesforce: "Salesforce",
  klaviyo: "Klaviyo",
  mailerlite: "MailerLite",
  contentstudio: "ContentStudio",
  amplitude: "Amplitude",
  productboard: "Productboard",
  "aha!": "Aha!",
  zotero: "Corporation for Digital Scholarship",
  jenkins: "Jenkins",
  "kubernetes (k8s)": "CNCF",
  helm: "CNCF",
  "synthesys ai studio": "Synthesys",
  "ticnote cloud": "TicNote",
  "cognitomeet": "CognitoMeet",
  "daily.dev recruiter": "daily.dev",
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

/** Distinct owner names from the curated map (index extras, no snapshot scan). */
export function listCuratedOwnerNames(): string[] {
  return [...new Set(PARENT_COMPANIES.values())];
}

/** Product keys whose curated owner slug-matches this company URL. */
export function curatedProductKeysForCompanySlug(slug: string): string[] {
  const keys: string[] = [];
  for (const [productKey, company] of PARENT_COMPANIES) {
    if (toBrandSlug(company) === slug) keys.push(productKey);
  }
  return keys;
}
