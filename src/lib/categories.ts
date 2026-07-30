export const CATEGORY_SLUG_MAP: Record<string, string> = {
  "ai-tools": "AI Tools",
  "saas-software": "SaaS Software",
  "ai-image-video-tools": "AI Image / Video Tools",
  "developer-tools": "Developer Tools",
  "marketing-tools": "Marketing Tools",
};

export const CATEGORY_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_SLUG_MAP).map(([slug, name]) => [name, slug])
);
