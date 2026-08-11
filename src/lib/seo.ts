import { CATEGORY_SLUG_MAP } from "@/lib/categories";
import { formatEngineList } from "@/lib/constants";

const ENGINE_COPY = formatEngineList();

/** Canonical production domain used by sitemap, robots, metadataBase, OG, JSON-LD. */
export const PRODUCTION_SITE_URL = "https://georadar.website";

function normalizeSiteUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getSiteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL;
  if (fromEnv) return normalizeSiteUrl(fromEnv);

  // Never fall back to *.vercel.app — that breaks Search Console / sitemap / canonical.
  if (process.env.NODE_ENV === "development" && !process.env.VERCEL) {
    return "http://localhost:3000";
  }

  return PRODUCTION_SITE_URL;
}

export const SITE_URL = getSiteUrl();

export function stringifyJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "ai-tools":
    `See which AI tools ${ENGINE_COPY} recommend most. Weekly Top 20 AI visibility rankings, updated every Monday.`,
  "saas-software":
    `See which SaaS products AI recommends to buyers. Weekly Top 20 visibility rankings across ${ENGINE_COPY}.`,
  "ai-image-video-tools":
    `See which image and video AI tools make the shortlist. Weekly Top 20 rankings from ${ENGINE_COPY}.`,
  "developer-tools":
    `See which developer tools AI tells engineers to use. Weekly Top 20 rankings across ${ENGINE_COPY}.`,
  "marketing-tools":
    `See which marketing tools AI recommends for growth teams. Weekly Top 20 rankings from ${ENGINE_COPY}.`,
  "vpn-services":
    `See which VPN services ${ENGINE_COPY} recommend for privacy and secure browsing. Top 20 AI visibility rankings.`,
  "ecommerce-platforms":
    `See which ecommerce platforms AI recommends for online stores. Top 20 visibility rankings across ${ENGINE_COPY}.`,
  "online-course-platforms":
    `See which online course and MOOC platforms AI recommends. Top 20 rankings from ${ENGINE_COPY}.`,
  "language-learning-apps":
    `See which language learning apps AI recommends for daily practice. Top 20 rankings across ${ENGINE_COPY}.`,
  "password-managers":
    `See which password managers AI recommends for secure vaults. Top 20 visibility rankings from ${ENGINE_COPY}.`,
  "ai-meeting-assistants":
    `See which AI meeting assistants AI recommends for notes and transcripts. Top 20 rankings across ${ENGINE_COPY}.`,
  "ai-cybersecurity-tools":
    `See which AI cybersecurity tools make the threat detection shortlist. Top 20 rankings from ${ENGINE_COPY}.`,
  "recruiting-tools":
    `See which ATS and recruiting tools AI recommends for hiring teams. Top 20 rankings across ${ENGINE_COPY}.`,
};

export function getCategorySeo(slug: string) {
  const category = CATEGORY_SLUG_MAP[slug];
  if (!category) return null;
  return {
    category,
    title: `Who Does AI Recommend in ${category}?`,
    description:
      CATEGORY_DESCRIPTIONS[slug] ??
      `See which ${category} products ${ENGINE_COPY} recommend. Weekly Top 20 AI visibility rankings.`,
    keywords: [
      `${category} AI visibility rankings`,
      `${category} AI visibility`,
      `${category} GEO rankings`,
      `${category} ChatGPT rankings`,
      `${category} Gemini rankings`,
      `${category} Grok rankings`,
      `${category} Perplexity rankings`,
      `${category} Claude rankings`,
      `${category} DeepSeek rankings`,
    ],
    canonicalPath: `/category/${slug}`,
  };
}
