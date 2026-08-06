"use client";

import Link from "next/link";
import {
  formatLocaleDate,
  formatWeekLabel,
  getCategoryMessages,
  type CategorySlug,
} from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/use-i18n";

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

type Leader = { brandName: string } | null;

type Props = {
  publishedAt: string | null;
  week: string | null;
  cards: { slug: CategorySlug; leader: Leader }[];
};

export function RankingsContent({ publishedAt, week, cards }: Props) {
  const { locale, m } = useI18n();
  const updatedAt = publishedAt ? formatLocaleDate(locale, publishedAt) : null;
  const weekLabel = week ? formatWeekLabel(m, week) : null;

  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-10 pb-8 sm:pt-14 sm:pb-10">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {m.rankings.eyebrow}
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl sm:leading-[1.08]">
          {m.rankings.h1Line1}
          <br />
          {m.rankings.h1Line2}
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
          {m.rankings.lead}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs text-[var(--text-muted)]">
          {weekLabel && <span>{weekLabel}</span>}
          {updatedAt && (
            <>
              <span className="text-[var(--border-hover)]">·</span>
              <span>{m.common.updated(updatedAt)}</span>
            </>
          )}
          <span className="text-[var(--border-hover)]">·</span>
          <span>{m.rankings.categoriesCount}</span>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20 sm:pb-28">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
          {cards.map((card, index) => {
            const cat = getCategoryMessages(m, card.slug);
            if (!cat) return null;
            const isLast = index === cards.length - 1;

            return (
              <Link
                key={card.slug}
                href={`/category/${card.slug}`}
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
                    <span className="font-mono text-xs text-[var(--text-muted)]">
                      {m.common.top20}
                    </span>
                  </div>
                  <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
                    {cat.description}
                  </p>
                  {card.leader && (
                    <p className="mt-3 font-mono text-xs text-[var(--text-secondary)]">
                      <span className="text-[var(--text-muted)]">{m.rankings.leaderThisWeek}</span>
                      <span className="mx-2 text-[var(--border-hover)]">·</span>
                      <span className="font-medium text-[var(--text)]">{card.leader.brandName}</span>
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
    </>
  );
}
