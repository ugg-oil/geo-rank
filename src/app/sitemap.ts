import type { MetadataRoute } from "next";
import { getLayerBBrandSlugs } from "@/lib/brand-enrichment";
import { CATEGORY_SLUG_MAP } from "@/lib/categories";
import { SITE_URL } from "@/lib/seo";
import { getCurrentWeek } from "@/lib/week";

const METHODOLOGY_LAST_MODIFIED = new Date("2026-07-30T00:00:00.000Z");

function getCurrentWeekDate() {
  const week = getCurrentWeek();
  const date = week.replace("Week of ", "");
  return new Date(`${date}T00:00:00.000Z`);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rankingLastModified = getCurrentWeekDate();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: rankingLastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/rankings`,
      lastModified: rankingLastModified,
      changeFrequency: "weekly",
      priority: 0.95,
    },
    {
      url: `${SITE_URL}/methodology`,
      lastModified: METHODOLOGY_LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = Object.keys(CATEGORY_SLUG_MAP).map(
    (slug) => ({
      url: `${SITE_URL}/category/${slug}`,
      lastModified: rankingLastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    })
  );

  let brandRoutes: MetadataRoute.Sitemap = [];
  try {
    const layerBSlugs = await getLayerBBrandSlugs();
    brandRoutes = layerBSlugs.map((slug) => ({
      url: `${SITE_URL}/brand/${slug}`,
      lastModified: rankingLastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    brandRoutes = [];
  }

  return [...staticRoutes, ...categoryRoutes, ...brandRoutes];
}
