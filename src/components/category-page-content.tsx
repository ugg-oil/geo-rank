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
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {m.common.allRankings}
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {m.category.whoRecommends(categoryName)}
        </h1>
        {cat && (
          <div className="mt-4 max-w-3xl">
            <p className="text-sm leading-7 text-[var(--text-secondary)]">{cat.lead}</p>
            <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">{cat.body}</p>
          </div>
        )}
        <div className="mt-5">
          <WeekSelector
            slug={slug}
            week={week}
            availableWeeks={availableWeeks}
            engine={initialTab}
          />
        </div>
      </div>

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
      <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--card)] p-8">
        <h1 className="text-xl font-semibold">{m.category.historicalUnavailable}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {m.category.historicalNone(formatWeekLabel(m, selectedWeek))}
        </p>
      </div>
    </main>
  );
}
