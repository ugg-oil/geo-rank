import type { Metadata } from "next";
import { CATEGORY_SLUG_MAP } from "@/lib/categories";
import { ENGINES } from "@/lib/constants";
import { getAllCategoryLeaderboards } from "@/lib/leaderboard";
import { CATEGORY_INTROS } from "@/lib/page-content";
import { getPublishedCategoryLeaderboards, getPublishedLeaderboardWeeks } from "@/lib/published-leaderboard";
import { getCategorySeo, SITE_URL, stringifyJsonLd } from "@/lib/seo";
import { getCurrentWeek } from "@/lib/week";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WeekSelector } from "@/components/week-selector";
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

  const initialTab =
    engine && ENGINES.includes(engine as (typeof ENGINES)[number])
      ? (engine as (typeof ENGINES)[number])
      : "overall";

  const currentWeek = getCurrentWeek();
  const selectedWeek = requestedWeek && /^\d{4}-\d{2}-\d{2}$/.test(requestedWeek)
    ? `Week of ${requestedWeek}`
    : currentWeek;
  const [publishedData, availableWeeks] = await Promise.all([
    getPublishedCategoryLeaderboards(slug, selectedWeek),
    getPublishedLeaderboardWeeks(),
  ]);
  const data = publishedData ?? (selectedWeek === currentWeek ? await getAllCategoryLeaderboards(category) : null);
  const intro = CATEGORY_INTROS[slug];
  const canonicalUrl = `${SITE_URL}/category/${slug}`;
  if (!data) {
    return <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14"><Link href={`/category/${slug}`} className="text-sm text-[var(--text-secondary)]">← Back to latest rankings</Link><div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--card)] p-8"><h1 className="text-xl font-semibold">Historical week unavailable</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">No published rankings are available for {selectedWeek}.</p></div></main>;
  }
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
    <main className="mx-auto max-w-6xl px-6 pt-4 pb-10 sm:pt-5 sm:pb-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(itemListJsonLd) }}
      />
      <Link
        href="/rankings"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        All rankings
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Who does AI recommend in {category}?
        </h1>
        {intro && (
          <div className="mt-4 max-w-3xl">
            <p className="text-sm leading-7 text-[var(--text-secondary)]">
              {intro.lead}
            </p>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
              {intro.paragraphs.slice(0, 1).map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        )}
        <div className="mt-5">
          <WeekSelector
            slug={slug}
            week={data.week}
            availableWeeks={availableWeeks.length > 0 ? availableWeeks : [data.week]}
            engine={initialTab}
          />
        </div>
      </div>

      <CategoryBoard
        slug={slug}
        data={data}
        initialTab={initialTab}
        availableWeeks={availableWeeks.length > 0 ? availableWeeks : [data.week]}
      />
    </main>
  );
}
