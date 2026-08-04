import type { Metadata } from "next";
import Link from "next/link";
import { BiggestMoversSection } from "@/components/biggest-movers";
import { getBiggestMovers } from "@/lib/biggest-movers";
import { getPublishedLeaderboardManifest } from "@/lib/published-leaderboard";
import { SITE_URL, stringifyJsonLd } from "@/lib/seo";

const STATS = [
  { value: "3", label: "AI engines tracked" },
  { value: "5", label: "Product categories" },
  { value: "120", label: "Prompts every week" },
  { value: "Top 20", label: "Products per board" },
];

const ENGINES = [
  { name: "ChatGPT", model: "GPT-4o" },
  { name: "Gemini", model: "2.5 Flash" },
  { name: "Grok", model: "Grok 4.5" },
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
    absolute: "Which Products Does AI Recommend? | GEO Radar",
  },
  description:
    "See the Top 20 products showing up in ChatGPT, Gemini, and Grok answers. Weekly AI visibility rankings, updated every Monday.",
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
    title: "Which Products Does AI Recommend? | GEO Radar",
    description:
      "See the Top 20 products showing up in ChatGPT, Gemini, and Grok answers. Weekly AI visibility rankings, updated every Monday.",
    url: "/",
    type: "website",
    images: [{ url: "/og-image.png", alt: "GEO Radar" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Which Products Does AI Recommend? | GEO Radar",
    description:
      "See the Top 20 products showing up in ChatGPT, Gemini, and Grok answers. Weekly AI visibility rankings, updated every Monday.",
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
  const [manifest, movers] = await Promise.all([
    getPublishedLeaderboardManifest(),
    getBiggestMovers(5),
  ]);
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
      "See which products ChatGPT, Gemini, and Grok recommend. Weekly Top 20 AI visibility rankings.",
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
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--yellow)]" />
          Live weekly rankings · {updatedAt ? `Updated ${updatedAt}` : "Fresh every Monday"}
        </div>

        <h1 className="animate-fade-up-delay-1 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-6xl sm:leading-[1.08]">
          Which products does
          <br />
          AI actually recommend?
        </h1>

        <p className="animate-fade-up-delay-2 mt-6 max-w-xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
          If ChatGPT, Gemini, or Grok never mention a product, customers never see it.
          GEO Radar shows the Top 20 that make the shortlist — every Monday.
        </p>

        <div className="animate-fade-up-delay-3 mt-8 flex flex-wrap items-center gap-3">
          <Link href="/rankings" className="btn-primary px-5 py-2.5">
            See this week&apos;s rankings
            <ArrowIcon />
          </Link>
          <Link
            href="/methodology"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text)]"
          >
            How we score them
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
                Why this matters
              </span>
              <span className="h-2 w-2 rounded-full bg-[var(--yellow)]" />
            </div>
            <p className="text-xl font-medium leading-snug tracking-tight text-[var(--text)]">
              Search shows options. AI picks winners.
            </p>
            <div className="mt-8 space-y-4 border-t border-[var(--border)] pt-5">
              <div className="flex gap-3">
                <span className="font-mono text-xs text-[var(--text-muted)]">01</span>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  Buyers ask ChatGPT who to use — and trust the shortlist.
                </p>
              </div>
              <div className="flex gap-3">
                <span className="font-mono text-xs text-[var(--text-muted)]">02</span>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  GEO Radar shows who made that shortlist this week.
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

      {movers && (movers.risers.length > 0 || movers.fallers.length > 0) && (
        <BiggestMoversSection
          week={movers.week}
          risers={movers.risers}
          fallers={movers.fallers}
        />
      )}

      {/* Engine strip */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-8 sm:flex-row sm:items-center">
          <p className="text-sm text-[var(--text-muted)]">
            Rankings built from real answers across three AI engines
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

      {/* How it works */}
      <section className="border-t border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <h2 className="mb-12 text-center text-xl font-semibold tracking-tight sm:text-2xl">
            Ask AI. Extract the shortlist. Rank it.
          </h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Ask the engines",
                desc: "Every week we run the same discovery prompts across ChatGPT, Gemini, and Grok.",
              },
              {
                step: "02",
                title: "Pull the names",
                desc: "We extract which products get mentioned — and how high they appear.",
              },
              {
                step: "03",
                title: "Publish the Top 20",
                desc: "Scores update Monday with week-over-week movement, so you can see who rose.",
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
