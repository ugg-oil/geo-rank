import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORY_CARDS } from "@/lib/category-cards";
import {
  getPublishedCategoryLeaderboards,
  getPublishedLeaderboardManifest,
} from "@/lib/published-leaderboard";

export const metadata: Metadata = {
  title: "AI Visibility Rankings",
  description:
    "Browse weekly Top 20 AI visibility rankings across AI Tools, SaaS, creative, developer, and marketing categories.",
  alternates: {
    canonical: "/rankings",
  },
  openGraph: {
    title: "AI Visibility Rankings | GEO Radar",
    description:
      "Browse weekly Top 20 AI visibility rankings across AI Tools, SaaS, creative, developer, and marketing categories.",
    url: "/rankings",
    type: "website",
    images: [{ url: "/og-image.png", alt: "GEO Radar" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Visibility Rankings | GEO Radar",
    description:
      "Browse weekly Top 20 AI visibility rankings across AI Tools, SaaS, creative, developer, and marketing categories.",
    images: ["/og-image.png"],
  },
};

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
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

export default async function RankingsPage() {
  const [manifest, ...boards] = await Promise.all([
    getPublishedLeaderboardManifest(),
    ...CATEGORY_CARDS.map((cat) => getPublishedCategoryLeaderboards(cat.slug)),
  ]);

  const updatedAt = manifest?.publishedAt
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(manifest.publishedAt))
    : null;
  const week = manifest?.week ?? boards.find(Boolean)?.week ?? null;

  return (
    <main className="relative overflow-hidden">
      <section className="mx-auto max-w-6xl px-6 pt-10 pb-8 sm:pt-14 sm:pb-10">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Rankings
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl sm:leading-[1.08]">
          Pick a category.
          <br />
          See who AI picks.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
          Weekly Top 20 boards across ChatGPT, Gemini, and Grok — refreshed every Monday.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-[var(--text-muted)]">
          {week && <span>{week}</span>}
          {updatedAt && (
            <>
              <span className="text-[var(--border-hover)]">·</span>
              <span>Updated {updatedAt}</span>
            </>
          )}
          <span className="text-[var(--border-hover)]">·</span>
          <span>5 categories</span>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20 sm:pb-28">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
          {CATEGORY_CARDS.map((cat, index) => {
            const board = boards[index];
            const leader = board?.boards.overall.snapshots[0] ?? null;
            const isLast = index === CATEGORY_CARDS.length - 1;

            return (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className={`group grid gap-4 bg-[var(--card)] px-5 py-6 transition-colors hover:bg-[var(--card-hover)] sm:grid-cols-[3rem_1fr_auto] sm:items-center sm:gap-6 sm:px-6 ${
                  isLast ? "" : "border-b border-[var(--border)]"
                }`}
              >
                <span className="font-mono text-sm text-[var(--text-muted)]">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="text-lg font-semibold tracking-tight text-[var(--text)]">
                      {cat.name}
                    </h2>
                    <span className="font-mono text-xs text-[var(--text-muted)]">Top 20</span>
                  </div>
                  <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
                    {cat.description}
                  </p>
                  {leader && (
                    <p className="mt-3 font-mono text-xs text-[var(--text-secondary)]">
                      <span className="text-[var(--text-muted)]">#1 this week</span>
                      <span className="mx-2 text-[var(--border-hover)]">·</span>
                      <span className="font-medium text-[var(--text)]">{leader.brandName}</span>
                    </p>
                  )}
                </div>

                <span className="inline-flex h-9 w-9 items-center justify-center self-start rounded-full border border-[var(--border)] text-[var(--text-muted)] transition-colors group-hover:border-[var(--border-hover)] group-hover:text-[var(--text)] sm:self-center">
                  <ArrowIcon />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
