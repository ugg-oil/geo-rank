import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedCategoryLeaderboards, getPublishedLeaderboardManifest } from "@/lib/published-leaderboard";
import { SITE_URL, stringifyJsonLd } from "@/lib/seo";

const STATS = [
  { value: "3", label: "AI Engines" },
  { value: "5", label: "Categories" },
  { value: "120", label: "Weekly Queries" },
  { value: "Top 20", label: "Per Category" },
];

const ENGINES = [
  { name: "ChatGPT", model: "GPT-4o" },
  { name: "Gemini", model: "2.5 Flash" },
  { name: "Grok", model: "Grok 4.5" },
];

const CATEGORY_CARDS = [
  {
    name: "AI Tools Visibility Rankings",
    slug: "ai-tools",
    description:
      "Weekly AI visibility ranking of assistants, copilots, and productivity tools recommended by leading AI engines.",
    count: "Top 20",
  },
  {
    name: "SaaS AI Visibility Rankings",
    slug: "saas-software",
    description:
      "Weekly AI visibility ranking of SaaS products and business software most frequently recommended in AI answers.",
    count: "Top 20",
  },
  {
    name: "AI Image / Video Visibility Rankings",
    slug: "ai-image-video-tools",
    description:
      "Weekly AI visibility ranking of generative image and video tools across ChatGPT, Gemini, and Grok.",
    count: "Top 20",
  },
  {
    name: "Developer Tools AI Visibility Rankings",
    slug: "developer-tools",
    description:
      "Weekly AI visibility ranking of developer tools, IDEs, and coding platforms recommended by major AI engines.",
    count: "Top 20",
  },
  {
    name: "Marketing Tools AI Visibility Rankings",
    slug: "marketing-tools",
    description:
      "Weekly AI visibility ranking of marketing and growth platforms recommended in generative AI responses.",
    count: "Top 20",
  },
];

const CATEGORY_SHORTCUTS = [
  { label: "AI Tools", slug: "ai-tools" },
  { label: "SaaS", slug: "saas-software" },
  { label: "AI Image / Video", slug: "ai-image-video-tools" },
  { label: "Developer", slug: "developer-tools" },
  { label: "Marketing", slug: "marketing-tools" },
];

export const metadata: Metadata = {
  title: {
    absolute: "AI Visibility Rankings for Products | GEO Radar",
  },
  description:
    "Weekly AI visibility rankings showing which products are recommended by ChatGPT, Gemini, and Grok across major software categories.",
  keywords: [
    "AI visibility",
    "AI visibility rankings",
    "AI product rankings",
    "GEO rankings",
    "ChatGPT product recommendations",
    "Gemini product recommendations",
    "Grok product recommendations",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "AI Visibility Rankings for Products | GEO Radar",
    description:
      "Weekly AI visibility rankings showing which products are recommended by ChatGPT, Gemini, and Grok across major software categories.",
    url: "/",
    type: "website",
    images: [{ url: "/og-image.png", alt: "GEO Radar" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Visibility Rankings for Products | GEO Radar",
    description:
      "Weekly AI visibility rankings showing which products are recommended by ChatGPT, Gemini, and Grok across major software categories.",
    images: ["/og-image.png"],
  },
};

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="transition-transform group-hover:translate-x-0.5"
      aria-hidden
    >
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function Home() {
  const [manifest, aiToolsBoard] = await Promise.all([
    getPublishedLeaderboardManifest(),
    getPublishedCategoryLeaderboards("ai-tools"),
  ]);
  const topFive = aiToolsBoard?.boards.overall.snapshots.slice(0, 5) ?? [];
  const updatedAt = manifest?.publishedAt
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(manifest.publishedAt))
    : null;
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GEO Radar",
    url: SITE_URL,
    description:
      "Weekly AI visibility rankings across ChatGPT, Gemini, and Grok based on GEO methodology.",
  };
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "GEO Radar",
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
  };

  return (
    <main className="relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(organizationJsonLd) }}
      />
      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pt-16 pb-12 sm:pt-24 sm:pb-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
        <div className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs text-[var(--text-secondary)]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--yellow)] opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--yellow)]" />
          </span>
          Weekly AI visibility rankings · {updatedAt ? `Last updated ${updatedAt}` : "Updated every Monday"}
        </div>

        <h1 className="animate-fade-up-delay-1 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-6xl sm:leading-[1.08]">
          AI Visibility Rankings
          <br />
          for products in AI answers
        </h1>

        <p className="animate-fade-up-delay-2 mt-6 max-w-xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
          Track which products are recommended by ChatGPT, Gemini, and Grok.
          <br />
          GEO Radar turns AI answers into weekly visibility rankings.
        </p>

        <div className="animate-fade-up-delay-3 mt-8 flex flex-wrap items-center gap-3">
          <Link href="#rankings" className="btn-primary px-5 py-2.5">
            Explore AI visibility rankings
            <ArrowIcon />
          </Link>
          <Link
            href="/methodology"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text)]"
          >
            Why GEO matters
          </Link>
        </div>

        <div className="animate-fade-up-delay-3 mt-8 flex flex-wrap gap-2">
          {CATEGORY_SHORTCUTS.map((category) => (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text)]"
            >
              {category.label}
            </Link>
          ))}
        </div>
          </div>

          <div className="animate-fade-up-delay-2 hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 lg:block">
            <div className="mb-8 flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Why AI visibility now
              </span>
              <span className="h-2 w-2 rounded-full bg-[var(--yellow)] shadow-[0_0_14px_var(--yellow)]" />
            </div>
            <p className="text-xl font-medium leading-snug tracking-tight text-[var(--text)]">
              AI answers are becoming the new recommendation layer between people and products.
            </p>
            <div className="mt-8 space-y-4 border-t border-[var(--border)] pt-5">
              <div className="flex gap-3">
                <span className="font-mono text-xs text-[var(--text-muted)]">01</span>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  Search shows a list. Generative AI makes a shortlist.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="font-mono text-xs text-[var(--text-muted)]">02</span>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  AI visibility tracks which products earn a place in those answers.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="animate-fade-up-delay-3 mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="bg-[var(--card)] px-5 py-4 text-center sm:text-left"
            >
              <div className="font-mono text-2xl font-semibold tracking-tight text-[var(--text)]">
                {stat.value}
              </div>
              <div className="mt-0.5 text-xs text-[var(--text-muted)]">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Proof points */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              This week&apos;s snapshot
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">Top 5 AI Tools</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              Products most visible in recommendations from ChatGPT, Gemini, and Grok.
            </p>
            {topFive.length > 0 ? (
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {topFive.map((row) => (
                  <Link
                    key={row.brandId}
                    href="/category/ai-tools"
                    className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 transition-colors hover:border-[var(--border-hover)]"
                  >
                    <span className="w-7 font-mono text-xs text-[var(--text-muted)]">#{row.rank}</span>
                    <span className="text-sm font-medium">{row.brandName}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-6 text-sm text-[var(--text-muted)]">This week&apos;s ranking is being prepared.</p>
            )}
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Coverage</p>
            <div className="mt-5 grid grid-cols-2 gap-5">
              {[
                ["3", "AI engines"],
                ["120", "Weekly queries"],
                ["5", "Categories"],
                ["Top 20", "Per category"],
              ].map(([value, label]) => (
                <div key={label}>
                  <div className="font-mono text-xl font-semibold text-[var(--text)]">{value}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">{label}</div>
                </div>
              ))}
            </div>
            <Link href="/methodology" className="mt-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text)]">
              How rankings work <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      {/* Engine strip */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-8 sm:flex-row sm:items-center">
          <p className="text-sm text-[var(--text-muted)]">
            Tracked across three leading AI engines via official APIs
          </p>
          <div className="flex flex-wrap gap-3">
            {ENGINES.map((engine) => (
              <div
                key={engine.name}
                className="flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3.5 py-2"
              >
                <span className="text-sm font-medium">{engine.name}</span>
                <span className="font-mono text-xs text-[var(--text-muted)]">{engine.model}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="rankings" className="scroll-mt-20 mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              AI Visibility Rankings by Category
            </h2>
            <p className="mt-1.5 text-sm text-[var(--text-muted)]">
              Weekly product visibility rankings across ChatGPT, Gemini, and Grok by category
            </p>
          </div>
          <Link
            href="/methodology"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
          >
            How scoring works
            <ArrowIcon />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_CARDS.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="group card-shine relative flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 transition-all hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)]"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-xs text-[var(--text-muted)]">{cat.count}</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-muted)] transition-colors group-hover:border-[var(--border-hover)] group-hover:text-[var(--text)]">
                  <ArrowIcon />
                </span>
              </div>
              <h3 className="text-base font-semibold tracking-tight group-hover:text-[var(--text)] transition-colors">
                {cat.name}
              </h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-[var(--text-muted)]">
                {cat.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <h2 className="mb-12 text-center text-xl font-semibold tracking-tight sm:text-2xl">
            From AI response to visibility leaderboard
          </h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Collect",
                desc: "8 category-specific prompts × 3 engines, every week via official APIs",
              },
              {
                step: "02",
                title: "Extract & Normalize",
                desc: "LLM extracts brand mentions, matches aliases, and deduplicates names",
              },
              {
                step: "03",
                title: "Score & Publish",
                desc: "Weighted AI visibility score ranks Top 20 with week-over-week movement",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="mb-3 font-mono text-xs text-[var(--text-muted)]">{item.step}</div>
                <h3 className="mb-2 text-base font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--text-muted)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
