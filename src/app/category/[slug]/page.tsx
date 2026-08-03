import type { Metadata } from "next";
import { CATEGORY_SLUG_MAP } from "@/lib/categories";
import { ENGINES } from "@/lib/constants";
import { getAllCategoryLeaderboards } from "@/lib/leaderboard";
import { CATEGORY_INTROS } from "@/lib/page-content";
import { getPublishedCategoryLeaderboards } from "@/lib/published-leaderboard";
import { getCategorySeo, SITE_URL, stringifyJsonLd } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryBoard } from "./CategoryBoard";

export const revalidate = 300;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ engine?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
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
  const { engine } = await searchParams;
  const category = CATEGORY_SLUG_MAP[slug];
  if (!category) notFound();

  const initialTab =
    engine && ENGINES.includes(engine as (typeof ENGINES)[number])
      ? (engine as (typeof ENGINES)[number])
      : "overall";

  const data =
    (await getPublishedCategoryLeaderboards(slug)) ??
    (await getAllCategoryLeaderboards(category));
  const intro = CATEGORY_INTROS[slug];
  const canonicalUrl = `${SITE_URL}/category/${slug}`;
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
    <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(itemListJsonLd) }}
      />
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        All categories
      </Link>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Who does AI recommend in {category}?
          </h1>
          <p className="mt-1.5 font-mono text-sm text-[var(--text-muted)]">
            {data.week} · Top 20 · ChatGPT · Gemini · Grok
          </p>
        </div>
      </div>

      {intro && (
        <section className="mb-8 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 sm:p-6">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.45fr]">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                This week&apos;s board
              </p>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-[var(--text)]">
                {intro.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                {intro.lead}
              </p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
                {intro.paragraphs.slice(0, 1).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>

            <aside className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
              <h3 className="text-sm font-semibold tracking-tight text-[var(--text)]">
                What you&apos;ll see
              </h3>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                {intro.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--yellow)]" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/methodology"
                className="mt-5 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text)]"
              >
                How we score this
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </aside>
          </div>
        </section>
      )}

      <CategoryBoard slug={slug} data={data} initialTab={initialTab} />
    </main>
  );
}
