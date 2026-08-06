import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandPageContent } from "@/components/brand-page-content";
import {
  getBrandLayerBStatus,
  getSimilarBrandsForBrand,
} from "@/lib/brand-enrichment";
import { getBrandCategoryHistories } from "@/lib/brand-history";
import { getBrandIndex, getPublishedBrandPage, type BrandPageData } from "@/lib/brand-page";
import { CATEGORY_SLUG_MAP } from "@/lib/categories";
import { CATEGORY_CARDS } from "@/lib/category-cards";
import {
  COLLECTION_ENGINES,
  SCORING_VERSION,
  formatEngineList,
} from "@/lib/constants";
import { getAllCategoryLeaderboards, type CategoryBoardsData } from "@/lib/leaderboard";
import {
  getPublishedCategoryLeaderboards,
  getPublishedLeaderboardWeeks,
} from "@/lib/published-leaderboard";
import { getSiteUrl, stringifyJsonLd } from "@/lib/seo";
import { getCurrentWeek } from "@/lib/week";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
};

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

async function getFallbackBrandPage(slug: string): Promise<BrandPageData | null> {
  const week = getCurrentWeek();
  const boards = await Promise.all(
    CATEGORY_CARDS.map(async (category) => {
      const published = await getPublishedCategoryLeaderboards(category.slug, week);
      return {
        slug: category.slug,
        board: published ?? (await getAllCategoryLeaderboards(CATEGORY_SLUG_MAP[category.slug])),
      };
    })
  );

  const categories: BrandPageData["categories"] = [];
  let name: string | undefined;
  let parentCompany: string | null = null;

  for (const { slug: categorySlug, board } of boards as { slug: string; board: CategoryBoardsData }[]) {
    const overall = board.boards.overall;
    const row = overall.snapshots.find((snapshot) => snapshot.brandSlug === slug);
    if (!row) continue;

    name ??= row.brandName;
    parentCompany ??= row.parentCompanyName ?? null;
    const engines: Record<string, { rank: number; score: number }> = {};
    for (const engine of board.collectedEngines ?? COLLECTION_ENGINES) {
      const engineRow = board.boards[engine]?.snapshots.find(
        (snapshot) => snapshot.brandSlug === slug
      );
      if (engineRow) engines[engine] = { rank: engineRow.rank, score: engineRow.score };
    }
    categories.push({
      slug: categorySlug,
      rank: row.rank,
      score: row.score,
      mentionFrequency: row.appearanceRate,
      engines,
    });
  }

  if (!name) return null;
  return {
    schemaVersion: 1,
    scoringVersion: SCORING_VERSION,
    week,
    slug,
    name,
    parentCompany,
    updatedAt: new Date().toISOString(),
    collectedEngines: [...COLLECTION_ENGINES],
    categories,
  };
}

async function getBrandPage(slug: string): Promise<BrandPageData | null> {
  const [index, weeks] = await Promise.all([
    getBrandIndex(),
    getPublishedLeaderboardWeeks(),
  ]);
  const latestWeek = weeks[0];
  if (index[slug] && latestWeek) {
    const published = await getPublishedBrandPage(slug, latestWeek);
    if (published) return published;
  }
  return getFallbackBrandPage(slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [data, layerB] = await Promise.all([
    getBrandPage(slug),
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
  const { from } = await searchParams;
  const data = await getBrandPage(slug);
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
