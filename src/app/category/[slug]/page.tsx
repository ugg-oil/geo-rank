import type { Metadata } from "next";
import { CategoryUnavailable, CategoryPageShell } from "@/components/category-page-content";
import { CATEGORY_SLUG_MAP } from "@/lib/categories";
import { inferCollectedEngines } from "@/lib/leaderboard-data";
import { getPublishedCategoryLeaderboards, getPublishedLeaderboardWeeks } from "@/lib/published-leaderboard";
import { getCategorySeo, SITE_URL, stringifyJsonLd } from "@/lib/seo";
import { getCurrentWeek } from "@/lib/week";
import { notFound } from "next/navigation";
import { CategoryBoard } from "./CategoryBoard";

export const revalidate = 0;
// P0-A local preview: force this route to rebuild after entity hierarchy changes.

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ engine?: string; week?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { week } = await searchParams;
  const seo = getCategorySeo(slug);
  if (!seo) {
    return {
      title: "Category not found",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: {
      canonical: seo.canonicalPath,
    },
    robots: week ? { index: false, follow: true } : undefined,
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: seo.canonicalPath,
      type: "website",
      images: [{ url: "/og-image.png", alt: "GEO Radar" }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: ["/og-image.png"],
    },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { engine, week: requestedWeek } = await searchParams;
  const category = CATEGORY_SLUG_MAP[slug];
  if (!category) notFound();

  const currentWeek = getCurrentWeek();
  const availableWeeks = await getPublishedLeaderboardWeeks();
  let selectedWeek =
    requestedWeek && /^\d{4}-\d{2}-\d{2}$/.test(requestedWeek)
      ? `Week of ${requestedWeek}`
      : currentWeek;

  // DB-first: any week with snapshots (Blob not required).
  let data = await getPublishedCategoryLeaderboards(slug, selectedWeek);
  // P0: category may refresh on 14-day cadence — fall back to newest week that has this board.
  if (!data && !requestedWeek) {
    for (const week of availableWeeks) {
      data = await getPublishedCategoryLeaderboards(slug, week);
      if (data) {
        selectedWeek = week;
        break;
      }
    }
  }

  const initialTab =
    data && engine && inferCollectedEngines(data).includes(engine) ? engine : "overall";
  const canonicalUrl = `${SITE_URL}/category/${slug}`;
  if (!data) {
    return <CategoryUnavailable slug={slug} selectedWeek={selectedWeek} />;
  }
  const weeks = availableWeeks.length > 0 ? availableWeeks : [data.week];
  const overall = data.boards.overall;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: category,
        item: canonicalUrl,
      },
    ],
  };
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Who does AI recommend in ${category}?`,
    url: canonicalUrl,
    numberOfItems: overall.snapshots.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: overall.snapshots.map((row) => ({
      "@type": "ListItem",
      position: row.rank,
      name: row.brandName,
      url: canonicalUrl,
    })),
  };

  return (
    <main className="mx-auto max-w-6xl px-6 pt-3 pb-10 sm:pt-4 sm:pb-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(itemListJsonLd) }}
      />
      <CategoryPageShell
        slug={slug}
        week={data.week}
        availableWeeks={weeks}
        initialTab={initialTab}
      >
        <CategoryBoard
          slug={slug}
          data={data}
          initialTab={initialTab}
          availableWeeks={weeks}
        />
      </CategoryPageShell>
    </main>
  );
}
