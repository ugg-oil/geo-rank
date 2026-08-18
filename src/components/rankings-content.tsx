"use client";

import Link from "next/link";
import { useState } from "react";
import { CATEGORY_FAMILIES, type CategoryFamily } from "@/lib/category-cards";
import type { CategoryCardLeader } from "@/lib/published-leaderboard";
import {
  formatLocaleDate,
  formatWeekLabel,
  getCategoryMessages,
  type CategorySlug,
} from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/use-i18n";

function ArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      className="transition-transform duration-150 group-hover:translate-x-0.5"
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

function SearchIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
      aria-hidden
    >
      <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.2 9.2L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

type Card = {
  slug: CategorySlug;
  family: CategoryFamily;
  leaders: CategoryCardLeader[] | null;
};

type Props = {
  publishedAt: string | null;
  week: string | null;
  cards: Card[];
};

function CategoryCard({ card }: { card: Card }) {
  const { m } = useI18n();
  const cat = getCategoryMessages(m, card.slug);
  if (!cat) return null;

  const leaders = card.leaders ?? [];
  const published = leaders.length > 0;

  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate text-base font-semibold tracking-tight text-[var(--text)]">
          {cat.name}
        </h3>
        {published ? (
          <span className="shrink-0 text-[var(--text-muted)] transition-colors duration-150 group-hover:text-[var(--text)]">
            <ArrowIcon />
          </span>
        ) : (
          <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {m.rankings.unpublished}
          </span>
        )}
      </div>

      {published ? (
        <ol className="mt-3.5 space-y-2.5">
          {leaders.map((row) => (
            <li key={row.brandSlug} className="flex items-center gap-2.5">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--bg-elevated)] font-mono text-[10px] font-semibold tabular-nums text-[var(--text-muted)]">
                {row.rank}
              </span>
              <span
                className={`min-w-0 flex-1 truncate text-[13.5px] ${
                  row.rank === 1
                    ? "font-medium text-[var(--text)]"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                {row.brandName}
              </span>
              <span
                className={`shrink-0 font-mono text-[13px] tabular-nums ${
                  row.rank === 1
                    ? "font-semibold text-[var(--yellow)]"
                    : "font-medium text-[var(--text)]"
                }`}
              >
                {row.score.toFixed(1)}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-[var(--text-muted)]">
          {m.rankings.unpublishedHint}
        </p>
      )}
    </>
  );

  const shell = published
    ? "group block rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-4.5 transition-[border-color,background-color,box-shadow] duration-150 hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)] hover:shadow-[var(--shadow-card)]"
    : "block rounded-xl border border-dashed border-[var(--border)] px-5 py-4.5 opacity-60";

  if (!published) return <div className={shell}>{inner}</div>;

  return (
    <Link href={`/category/${card.slug}`} className={shell} title={m.rankings.viewBoard}>
      {inner}
    </Link>
  );
}

function CardGrid({ cards }: { cards: Card[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
      {cards.map((card) => (
        <CategoryCard key={card.slug} card={card} />
      ))}
    </div>
  );
}

export function RankingsContent({ publishedAt, week, cards }: Props) {
  const { locale, m } = useI18n();
  const [query, setQuery] = useState("");
  const updatedAt = publishedAt ? formatLocaleDate(locale, publishedAt) : null;
  const weekLabel = week ? formatWeekLabel(m, week) : null;

  const q = query.trim().toLowerCase();
  const matches = (card: Card) => {
    if (!q) return true;
    const cat = getCategoryMessages(m, card.slug);
    if (!cat) return false;
    if (cat.name.toLowerCase().includes(q) || cat.short.toLowerCase().includes(q)) {
      return true;
    }
    return (card.leaders ?? []).some((row) => row.brandName.toLowerCase().includes(q));
  };

  const filtered = cards.filter(matches);
  const published = filtered.filter((card) => (card.leaders?.length ?? 0) > 0);
  const pending = filtered.filter((card) => (card.leaders?.length ?? 0) === 0);

  const groups = CATEGORY_FAMILIES.map((family) => ({
    family,
    cards: published.filter((card) => card.family === family),
  })).filter((group) => group.cards.length > 0);

  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-8 pb-6 sm:pt-12 sm:pb-8">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl sm:leading-[1.08]">
          {m.rankings.h1Line1}
          <br />
          {m.rankings.h1Line2}
        </h1>
        <p className="mt-3.5 max-w-md text-base leading-snug text-[var(--text-secondary)]">
          {m.rankings.lead}
        </p>
        <p className="mt-1 max-w-md text-sm leading-snug text-[var(--text-muted)]">
          {m.rankings.leadDetail}
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20 sm:pb-28">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-3 border-t border-[var(--border)] pt-4">
          <div className="relative w-full sm:w-72">
            <SearchIcon />
            <input
              id="rankings-filter"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={m.rankings.filterPlaceholder}
              aria-label={m.rankings.filterPlaceholder}
              className="w-full appearance-none rounded-full border border-[var(--border)] bg-[var(--card)] py-2 pl-9 pr-9 text-sm text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-secondary)] hover:border-[var(--border-hover)] focus:border-[var(--border-hover)]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label={m.rankings.filterClear}
                className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--card-hover)] hover:text-[var(--text)]"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path
                    d="M2.5 2.5l7 7m0-7l-7 7"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-[var(--border)] px-2.5 py-1 font-mono text-[11px] tabular-nums text-[var(--text-secondary)]">
              {m.rankings.resultCount(filtered.length, cards.length)}
            </span>
            {weekLabel && (
              <span className="inline-flex items-center rounded-full border border-[var(--border)] px-2.5 py-1 font-mono text-[11px] tabular-nums text-[var(--text-secondary)]">
                {weekLabel}
              </span>
            )}
            {updatedAt && (
              <span className="hidden items-center font-mono text-[11px] text-[var(--text-muted)] sm:inline-flex">
                {m.common.updated(updatedAt)}
              </span>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-[var(--border)] px-6 py-14 text-center text-sm text-[var(--text-muted)]">
            {m.rankings.filterEmpty}
          </p>
        ) : q ? (
          <div className="mt-6">
            <CardGrid cards={filtered} />
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <div key={group.family} className="mt-10 first:mt-8">
                <div className="mb-3.5 flex items-baseline gap-2.5">
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                    {m.rankings.families[group.family]}
                  </h2>
                  <span className="font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
                    {group.cards.length}
                  </span>
                </div>
                <CardGrid cards={group.cards} />
              </div>
            ))}

            {pending.length > 0 && (
              <details className="group mt-10 border-t border-[var(--border)] pt-4">
                <summary className="flex cursor-pointer list-none items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]">
                  <span className="transition-transform group-open:rotate-90">▸</span>
                  {m.rankings.unpublishedGroup(pending.length)}
                </summary>
                <div className="mt-4">
                  <CardGrid cards={pending} />
                </div>
              </details>
            )}
          </>
        )}
      </section>
    </>
  );
}
