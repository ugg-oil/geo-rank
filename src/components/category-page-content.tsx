"use client";

import Link from "next/link";
import { WeekSelector } from "@/components/week-selector";
import { formatWeekLabel, getCategoryMessages } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/use-i18n";

type Props = {
  slug: string;
  week: string;
  availableWeeks: string[];
  initialTab: string;
  children: React.ReactNode;
};

export function CategoryPageShell({
  slug,
  week,
  availableWeeks,
  initialTab,
  children,
}: Props) {
  const { m } = useI18n();
  const cat = getCategoryMessages(m, slug);
  const categoryName = cat?.name ?? slug;

  return (
    <>
      <Link
        href="/rankings"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {m.common.allRankings}
      </Link>

      <header className="surface mb-6 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 font-mono text-[11px] text-[var(--text-secondary)]">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
              {m.category.periodUpdated(formatWeekLabel(m, week))}
            </span>
            <h1 className="mt-2.5 text-2xl font-semibold leading-tight tracking-[-0.02em] text-balance sm:text-[2rem]">
              {m.category.whoRecommends(categoryName)}
            </h1>
          </div>
          <div className="shrink-0 sm:pt-1">
            <WeekSelector
              slug={slug}
              week={week}
              availableWeeks={availableWeeks}
              engine={initialTab}
            />
          </div>
        </div>
        {cat && (
          <>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[var(--text-secondary)]">
              {cat.lead}
            </p>
            {/* P2-6: the long body copy is kept verbatim, just folded away so the
                board is above the fold on a laptop. */}
            <details className="group mt-3">
              <summary className="inline-flex list-none items-center gap-1.5 text-xs font-semibold text-[var(--brand)] transition-opacity hover:opacity-80 [&::-webkit-details-marker]:hidden">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden
                  className="transition-transform group-open:rotate-90"
                >
                  <path
                    d="M4.5 2.5 8 6l-3.5 3.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="group-open:hidden">{m.category.aboutMore}</span>
                <span className="hidden group-open:inline">{m.category.aboutLess}</span>
              </summary>
              <p className="mt-2.5 max-w-3xl border-l-2 border-[var(--border)] pl-3.5 text-sm leading-7 text-[var(--text-muted)]">
                {cat.body}
              </p>
            </details>
          </>
        )}
      </header>

      {children}
    </>
  );
}

export function CategoryUnavailable({
  slug,
  selectedWeek,
}: {
  slug: string;
  selectedWeek: string;
}) {
  const { m } = useI18n();
  return (
    <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
      <Link href={`/category/${slug}`} className="text-sm text-[var(--text-secondary)]">
        {m.category.backToLatest}
      </Link>
      <div className="surface mt-8 p-8">
        <h1 className="text-xl font-semibold">{m.category.historicalUnavailable}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {m.category.historicalNone(formatWeekLabel(m, selectedWeek))}
        </p>
      </div>
    </main>
  );
}
