"use client";

import Link from "next/link";
import { BiggestMoversSection } from "@/components/biggest-movers";
import { CATEGORY_CARDS } from "@/lib/category-cards";
import { CATEGORIES } from "@/lib/constants";
import type { HomePageBundle, HomePeriodInsight } from "@/lib/home-page-data";
import { formatWeekLabel, getCategoryMessages } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { RankMover } from "@/lib/rank-change";

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

function InsightLine({ insight }: { insight: HomePeriodInsight }) {
  const { m } = useI18n();
  const categoryName =
    getCategoryMessages(m, insight.categorySlug)?.name ?? insight.categoryName;

  let suffix: string;
  if (insight.kind === "cross_riser") {
    const from = insight.fromRank != null ? `#${insight.fromRank}` : "—";
    const to = insight.toRank != null ? `#${insight.toRank}` : "—";
    suffix = m.home.insightCrossRiser(insight.spots ?? 0, categoryName, from, to);
  } else if (insight.kind === "took_first") {
    suffix = m.category.periodHighlightTookFirst(categoryName);
  } else if (insight.kind === "largest_climb") {
    suffix = m.category.periodHighlightLargestClimb(insight.spots ?? 0, insight.rank ?? 0);
  } else {
    suffix = m.category.periodHighlightDebut(insight.rank ?? 0);
  }

  return (
    <li className="text-sm leading-relaxed text-[var(--text-secondary)]">
      <Link
        href={`/brand/${insight.brandSlug}?from=${encodeURIComponent(`/category/${insight.categorySlug}`)}`}
        className="font-medium text-[var(--text)] hover:underline"
      >
        {insight.brandName}
      </Link>
      {suffix}
    </li>
  );
}

type Props = {
  scoringEngineCount: number;
  promptCount: number;
  movers: { week: string; risers: RankMover[]; fallers: RankMover[] } | null;
  bundle: HomePageBundle;
};

export function HomeContent({
  scoringEngineCount,
  promptCount,
  movers,
  bundle,
}: Props) {
  const { m } = useI18n();
  const { top5, insights } = bundle;
  const top5CategoryName = top5
    ? getCategoryMessages(m, top5.categorySlug)?.name ?? top5.categoryName
    : "";
  const hasTop5 = Boolean(top5 && top5.rows.length > 0);
  const top5Max = top5?.rows[0]?.score ?? 1;

  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-14 pb-10 sm:pt-20 sm:pb-12">
        <div
          className={`grid items-center gap-10 lg:gap-16 ${
            hasTop5 ? "lg:grid-cols-[1.1fr_0.9fr]" : ""
          }`}
        >
          <div>
            <div className="animate-fade-up mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs text-[var(--text-secondary)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--yellow)]" />
              {m.home.badgeFresh}
            </div>

            <h1 className="animate-fade-up-delay-1 text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl sm:leading-[1.06]">
              {m.home.h1Line1}
              <br />
              {m.home.h1Line2}
            </h1>

            <p className="animate-fade-up-delay-2 mt-5 max-w-lg text-base leading-relaxed text-[var(--text-secondary)]">
              {m.home.lead}
            </p>

            <div className="animate-fade-up-delay-3 mt-7 flex flex-wrap items-center gap-3">
              <Link href="/rankings" className="btn-primary group px-5 py-2.5">
                {m.home.ctaRankings}
                <ArrowIcon />
              </Link>
              <Link
                href="/methodology"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text)]"
              >
                {m.home.ctaMethodology}
              </Link>
            </div>

            <dl className="mt-8 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-mono text-xs text-[var(--text-muted)]">
              {[
                { value: scoringEngineCount, label: m.home.periodStatEngines },
                { value: promptCount, label: m.home.periodStatPrompts },
                { value: CATEGORIES.length, label: m.home.periodStatCategories },
              ].map((stat, index) => (
                <div key={stat.label} className="flex items-baseline gap-1.5">
                  {index > 0 && <span className="mr-1.5 opacity-40">·</span>}
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold tabular-nums text-[var(--text-secondary)]">
                      {stat.value}
                    </span>
                    <span className="uppercase tracking-[0.14em]">{stat.label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {top5 && hasTop5 && (
            <div className="animate-fade-up-delay-2 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
              <div className="border-b border-[var(--border)] px-5 pt-4 pb-3.5">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  {m.home.top5Eyebrow}
                </p>
                <h2 className="mt-1.5 text-base font-semibold tracking-tight text-[var(--text)]">
                  {m.home.top5Title(top5CategoryName)}
                </h2>
                <p className="mt-0.5 font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
                  {m.home.top5Period(formatWeekLabel(m, top5.week))}
                </p>
              </div>
              <ol className="p-2">
                {top5.rows.map((row) => (
                  <li key={row.brandSlug}>
                    <Link
                      href={`/brand/${row.brandSlug}?from=${encodeURIComponent(`/category/${top5.categorySlug}`)}`}
                      className="group relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--card-hover)]"
                    >
                      <span
                        aria-hidden
                        className="absolute inset-y-1 left-0 rounded-r-sm bg-[var(--yellow)]/12 transition-[width] duration-300"
                        style={{ width: `${Math.max(6, (row.score / top5Max) * 100)}%` }}
                      />
                      <span
                        className={`relative w-5 font-mono text-xs tabular-nums ${
                          row.rank === 1 ? "text-[var(--yellow)]" : "text-[var(--text-muted)]"
                        }`}
                      >
                        {row.rank}
                      </span>
                      <span className="relative min-w-0 flex-1 truncate text-sm font-medium text-[var(--text)]">
                        {row.brandName}
                      </span>
                      <span className="relative font-mono text-xs tabular-nums text-[var(--text-secondary)]">
                        {row.score.toFixed(1)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
              <Link
                href={`/category/${top5.categorySlug}`}
                className="group flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--card-hover)] hover:text-[var(--text)]"
              >
                {m.home.top5ViewFull}
                <ArrowIcon />
              </Link>
            </div>
          )}
        </div>
      </section>

      {movers && (movers.risers.length > 0 || movers.fallers.length > 0) && (
        <BiggestMoversSection
          week={movers.week}
          risers={movers.risers}
          fallers={movers.fallers}
          insightsSlot={
            insights.length > 0 ? (
              <ul className="mt-6 space-y-2 border-l-2 border-[var(--yellow)] pl-4">
                {insights.map((insight) => (
                  <InsightLine
                    key={`${insight.kind}-${insight.brandSlug}-${insight.categorySlug}`}
                    insight={insight}
                  />
                ))}
              </ul>
            ) : undefined
          }
        />
      )}

      <section className="border-t border-[var(--border)]">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {m.home.categoriesTitle}
              </h2>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {m.home.categoriesEyebrow}
              </span>
            </div>
            <Link
              href="/rankings"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text)]"
            >
              {m.home.categoriesViewAll}
              <ArrowIcon />
            </Link>
          </div>
          <div className="-mx-3 mt-5 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
            {CATEGORY_CARDS.map((card) => {
              const cat = getCategoryMessages(m, card.slug);
              if (!cat) return null;
              return (
                <Link
                  key={card.slug}
                  href={`/category/${card.slug}`}
                  className="group flex items-center gap-2.5 rounded-lg bg-[var(--card)]/60 px-3 py-2.5 transition-colors hover:bg-[var(--card)]"
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--border-hover)] transition-colors group-hover:bg-[var(--yellow)]"
                  />
                  <span className="truncate text-sm text-[var(--text-secondary)] transition-colors group-hover:text-[var(--text)]">
                    {cat.name}
                  </span>
                  <span className="ml-auto shrink-0 -translate-x-1 text-[var(--text-muted)] opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                    <ArrowIcon />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {m.home.howTitle}
            </h2>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {m.home.howEyebrow}
            </span>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
            {[
              { step: "01", title: m.home.how1Title, desc: m.home.how1Desc },
              { step: "02", title: m.home.how2Title, desc: m.home.how2Desc },
              { step: "03", title: m.home.how3Title, desc: m.home.how3Desc },
            ].map((item, index) => (
              <div key={item.step}>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-3xl font-semibold leading-none tabular-nums text-[var(--yellow)]">
                    {item.step}
                  </span>
                  <span
                    aria-hidden
                    className={`h-px flex-1 bg-gradient-to-r from-[var(--yellow)]/40 to-transparent ${
                      index === 2 ? "sm:hidden" : ""
                    }`}
                  />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-[var(--text)]">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
