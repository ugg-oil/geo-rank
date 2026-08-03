import { CATEGORY_SLUG_MAP } from "@/lib/categories";

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
    "See which AI tools ChatGPT, Gemini, and Grok recommend most. Weekly Top 20 AI visibility rankings, updated every Monday.",
  "saas-software":
    "See which SaaS products AI recommends to buyers. Weekly Top 20 visibility rankings across ChatGPT, Gemini, and Grok.",
  "ai-image-video-tools":
    "See which image and video AI tools make the shortlist. Weekly Top 20 rankings from ChatGPT, Gemini, and Grok.",
  "developer-tools":
    "See which developer tools AI tells engineers to use. Weekly Top 20 rankings across ChatGPT, Gemini, and Grok.",
  "marketing-tools":
    "See which marketing tools AI recommends for growth teams. Weekly Top 20 rankings from ChatGPT, Gemini, and Grok.",
};

export function getCategorySeo(slug: string) {
  const category = CATEGORY_SLUG_MAP[slug];
  if (!category) return null;
  return {
    category,
    title: `Who Does AI Recommend in ${category}? | GEO Radar`,
    description:
      CATEGORY_DESCRIPTIONS[slug] ??
      `See which ${category} products ChatGPT, Gemini, and Grok recommend. Weekly Top 20 AI visibility rankings.`,
    keywords: [
      `${category} AI visibility rankings`,
      `${category} AI visibility`,
      `${category} GEO rankings`,
      `${category} ChatGPT rankings`,
      `${category} Gemini rankings`,
      `${category} Grok rankings`,
    ],
    canonicalPath: `/category/${slug}`,
  };
}
