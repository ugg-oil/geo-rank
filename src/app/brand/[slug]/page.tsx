import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getBrandIndex, getPublishedBrandPage, type BrandPageData } from "@/lib/brand-page";
import { CATEGORY_SLUG_MAP } from "@/lib/categories";
import { CATEGORY_CARDS } from "@/lib/category-cards";
import { ENGINES } from "@/lib/constants";
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

/**
 * Keep local/dev brand links working before the next pipeline run publishes
 * brands/index.json. Published brand snapshots remain the canonical source.
 */
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
    for (const engine of ENGINES) {
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
    scoringVersion: 1,
    week,
    slug,
    name,
    parentCompany,
    updatedAt: new Date().toISOString(),
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
  const data = await getBrandPage(slug);
  if (!data) {
    return { title: "Brand not found", robots: { index: false, follow: false } };
  }
  return {
    title: `${data.name} — AI Visibility`,
    description: `See how ${data.name} ranks in weekly AI visibility rankings across ChatGPT, Gemini, and Grok.`,
    robots: { index: false, follow: true },
    alternates: { canonical: `/brand/${slug}` },
    openGraph: {
      title: `${data.name} — AI Visibility | GEO Radar`,
      description: `See how ${data.name} ranks in weekly AI visibility rankings across ChatGPT, Gemini, and Grok.`,
      url: `/brand/${slug}`,
      siteName: "GEO Radar",
      type: "website",
      images: [{ url: "/og-image.png", alt: "GEO Radar" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${data.name} — AI Visibility | GEO Radar`,
      description: `See how ${data.name} ranks in weekly AI visibility rankings across ChatGPT, Gemini, and Grok.`,
      images: ["/og-image.png"],
    },
  };
}

function EngineBadge({ engine, rank, score }: { engine: string; rank: number; score: number }) {
  const label = engine === "chatgpt" ? "ChatGPT" : engine === "gemini" ? "Gemini" : "Grok";
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2">
      <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
      <span className="font-mono text-xs text-[var(--text-muted)]">
        #{rank} &middot; {score.toFixed(1)}
      </span>
    </div>
  );
}

function CategoryCard({
  category,
}: {
  category: { slug: string; rank: number; score: number; mentionFrequency: number; engines: Record<string, { rank: number; score: number }> };
}) {
  const categoryName = CATEGORY_SLUG_MAP[category.slug] ?? category.slug;
  const engineEntries = ENGINES
    .filter((e) => category.engines[e])
    .map((e) => ({ engine: e, ...category.engines[e]! }));

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <Link
          href={`/category/${category.slug}`}
          className="text-base font-semibold text-[var(--text)] hover:text-[var(--text-secondary)] transition-colors"
        >
          {categoryName}
        </Link>
        <span className="font-mono text-lg font-semibold text-[var(--text)]">
          #{category.rank}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-xs text-[var(--text-muted)]">Score</span>
          <p className="font-mono text-lg font-semibold text-[var(--text)]">
            {category.score.toFixed(1)}
          </p>
        </div>
        <div>
          <span className="text-xs text-[var(--text-muted)]">Mention Frequency</span>
          <p className="font-mono text-lg font-semibold text-[var(--text)]">
            {(category.mentionFrequency * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {engineEntries.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs text-[var(--text-muted)]">Per Engine</span>
          {engineEntries.map((e) => (
            <EngineBadge key={e.engine} engine={e.engine} rank={e.rank} score={e.score} />
          ))}
        </div>
      )}
    </div>
  );
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { from } = await searchParams;
  const data = await getBrandPage(slug);
  if (!data) notFound();

  const backTarget = getValidBrandBackTarget(from);
  const backCategorySlug = backTarget?.pathname.split("/")[2] ?? "";
  const backLabel = backTarget
    ? CATEGORY_SLUG_MAP[backCategorySlug] ?? "Category rankings"
    : "All rankings";

  const categoryList = data.categories;

  // Fact-based Why recommends summary
  const topCategory = categoryList.reduce((best, c) => (c.rank < best.rank ? c : best), categoryList[0]);
  const topCategoryName = CATEGORY_SLUG_MAP[topCategory.slug] ?? topCategory.slug;
  const parentPart = data.parentCompany ? `, a product of ${data.parentCompany}` : "";
  const engineDescs = Object.entries(topCategory.engines)
    .map(([engine, e]) => {
      const label = engine === "chatgpt" ? "ChatGPT" : engine === "gemini" ? "Gemini" : "Grok";
      return `${label} ranks it #${e.rank}`;
    })
    .join(", ");

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
      <Link
        href={backTarget ? `${backTarget.pathname}${backTarget.search}` : "/rankings"}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {backLabel}
      </Link>

      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{data.name}</h1>
          {data.parentCompany && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{data.parentCompany}</p>
          )}
          <p className="mt-1.5 font-mono text-xs text-[var(--text-muted)]">Last updated &middot; {data.week}</p>
        </div>

        {/* Why recommends */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 sm:p-6">
          <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Why AI recommends {data.name}
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            {data.name}{parentPart} ranks #{topCategory.rank} in {topCategoryName} with a score of {topCategory.score.toFixed(1)}{" "}
            and a mention frequency of {(topCategory.mentionFrequency * 100).toFixed(0)}% across the latest weekly collection.
            {categoryList.length > 1
              ? ` It also appears in ${categoryList.length - 1} other categor${categoryList.length > 2 ? "ies" : "y"}.`
              : ""}
            {engineDescs && <> Engine differences: {engineDescs}.</>}
          </p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">Based on data from {data.week}.</p>
        </div>

        {/* Category cards */}
        {categoryList.length > 0 && (
          <div>
            <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">
              Rankings by Category
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {categoryList.map((cat) => (
                <CategoryCard key={cat.slug} category={cat} />
              ))}
            </div>
          </div>
        )}

        {/* CTA placeholder */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
          <p className="text-sm font-medium text-[var(--text)]">
            Track your brand&apos;s AI visibility
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Weekly updates on how your products appear in ChatGPT, Gemini, and Grok.
          </p>
          <span className="mt-3 inline-flex items-center rounded-lg bg-[var(--cta-bg)] px-4 py-2 text-sm font-medium text-[var(--cta-text)] opacity-60">
            Track Your Brand
          </span>
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">Coming soon</p>
        </div>
      </div>
    </main>
  );
}
