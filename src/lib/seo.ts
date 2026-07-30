import { CATEGORY_SLUG_MAP } from "@/lib/categories";

function normalizeSiteUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getSiteUrl() {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined);
  return normalizeSiteUrl(fromEnv ?? "http://localhost:3000");
}

export const SITE_URL = getSiteUrl();

export function stringifyJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "ai-tools":
    "Weekly AI visibility rankings for AI tools recommended by ChatGPT, Gemini, and Grok.",
  "saas-software":
    "Weekly SaaS software AI visibility rankings based on recommendations across ChatGPT, Gemini, and Grok.",
  "ai-image-video-tools":
    "Weekly AI visibility rankings for generative image and video tools in leading AI engines.",
  "developer-tools":
    "Weekly developer tools AI visibility rankings across ChatGPT, Gemini, and Grok answers.",
  "marketing-tools":
    "Weekly marketing tools AI visibility rankings based on recommendations from generative AI engines.",
};

export function getCategorySeo(slug: string) {
  const category = CATEGORY_SLUG_MAP[slug];
  if (!category) return null;
  return {
    category,
    title: `AI Visibility Rankings for ${category} 2026`,
    description:
      CATEGORY_DESCRIPTIONS[slug] ??
      `Weekly AI visibility rankings for ${category} across ChatGPT, Gemini, and Grok.`,
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
