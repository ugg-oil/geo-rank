import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandPageContent } from "@/components/brand-page-content";
import {
  getBrandLayerBStatus,
  getSimilarBrandsForBrand,
} from "@/lib/brand-enrichment";
import { getBrandCategoryHistories } from "@/lib/brand-history";
import { getPublishedBrandPage, type BrandPageData } from "@/lib/brand-page";
import {
  getPublishedLeaderboardWeeks,
} from "@/lib/published-leaderboard";
import { getSiteUrl, stringifyJsonLd } from "@/lib/seo";
import { formatEngineList } from "@/lib/constants";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; week?: string }>;
};

function weekFromFromParam(from?: string): string | undefined {
  if (!from) return undefined;
  try {
    const target = new URL(from, "http://localhost");
    const value = target.searchParams.get("week");
    return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function getValidBrandBackTarget(from?: string): URL | null {
  if (!from) return null;
  try {
    const target = new URL(from, "http://localhost");
    if (!target.pathname.startsWith("/category/")) return null;
    if (target.pathname.split("/").filter(Boolean).length !== 2) return null;
    return target;
  } catch {
    return null;
  }
}

async function getBrandPage(slug: string, requestedWeek?: string): Promise<BrandPageData | null> {
  const weeks = await getPublishedLeaderboardWeeks();
  const selectedWeek =
    requestedWeek && /^\d{4}-\d{2}-\d{2}$/.test(requestedWeek)
      ? `Week of ${requestedWeek}`
      : weeks[0];

  if (selectedWeek) {
    const published = await getPublishedBrandPage(slug, selectedWeek);
    if (published) return published;
  }

  // Fall back across published weeks when latest has no brand snapshot yet.
  if (!requestedWeek) {
    for (const week of weeks) {
      if (week === selectedWeek) continue;
      const published = await getPublishedBrandPage(slug, week);
      if (published) return published;
    }
  }

  return null;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { week, from } = await searchParams;
  const weekParam = week ?? weekFromFromParam(from);
  const [data, layerB] = await Promise.all([
    getBrandPage(slug, weekParam),
    getBrandLayerBStatus(slug),
  ]);
  if (!data) {
    return { title: "Brand not found", robots: { index: false, follow: false } };
  }
  return {
    title: `${data.name} — AI Visibility`,
    description: `See how ${data.name} ranks in weekly AI visibility rankings across ${formatEngineList()}.`,
    robots: layerB.layerB
      ? { index: true, follow: true }
      : { index: false, follow: true },
    alternates: { canonical: `/brand/${slug}` },
    openGraph: {
      title: `${data.name} — AI Visibility | GEO Radar`,
      description: `See how ${data.name} ranks in weekly AI visibility rankings across ${formatEngineList()}.`,
      url: `/brand/${slug}`,
      siteName: "GEO Radar",
      type: "website",
      images: [{ url: "/og-image.png", alt: "GEO Radar" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${data.name} — AI Visibility | GEO Radar`,
      description: `See how ${data.name} ranks in weekly AI visibility rankings across ${formatEngineList()}.`,
      images: ["/og-image.png"],
    },
  };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { from, week } = await searchParams;
  const weekParam = week ?? weekFromFromParam(from);
  const data = await getBrandPage(slug, weekParam);
  if (!data) notFound();

  const [histories, similarByCategory] = await Promise.all([
    getBrandCategoryHistories(slug),
    getSimilarBrandsForBrand(
      slug,
      data.categories.map((category) => category.slug)
    ),
  ]);

  const historyByCategory = Object.fromEntries(
    histories.map((entry) => [entry.categorySlug, entry.points])
  );

  const backTarget = getValidBrandBackTarget(from);
  const backCategorySlug = backTarget?.pathname.split("/")[2] ?? null;
  const backHref = backTarget
    ? `${backTarget.pathname}${backTarget.search}`
    : "/rankings";

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: getSiteUrl() },
      { "@type": "ListItem", position: 2, name: data.name, item: `${getSiteUrl()}/brand/${slug}` },
    ],
  };

  return (
    <main className="mx-auto max-w-6xl px-6 pt-4 pb-10 sm:pt-5 sm:pb-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(breadcrumbJsonLd) }}
      />
      <BrandPageContent
        data={data}
        historyByCategory={historyByCategory}
        similarByCategory={similarByCategory}
        backHref={backHref}
        backCategorySlug={backCategorySlug}
      />
    </main>
  );
}
