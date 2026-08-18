"use client";

import { useState } from "react";
import Link from "next/link";
import type { CompanyPageData } from "@/lib/company-page";
import {
  categoryRankDelta,
  sortCompanyProducts,
  type CompanyProductSortKey,
} from "@/lib/company-page-view";
import type { RankDelta } from "@/lib/rank-change";
import { formatWeekLabel, getCategoryMessages } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/use-i18n";

type Props = {
  data: CompanyPageData;
  fromBrandSlug?: string | null;
  backHref?: string;
  backCategorySlug?: string | null;
};

/**
 * One grid for header + all category rows so columns line up across products.
 * At lg the name column is capped and the four metric columns split whatever is
 * left evenly. The cap is a fixed length rather than fit-content because each
 * row is its own grid container, so a content-sized track would resolve to a
 * different width per row and the columns would stop lining up.
 */
const METRICS_GRID =
  "grid grid-cols-[minmax(0,1fr)_2.75rem_3.25rem_3rem_2.5rem] items-center gap-x-3 px-4 sm:grid-cols-[minmax(0,1fr)_4.5rem_5.5rem_9rem_4.5rem] sm:gap-x-4 sm:px-5 lg:grid-cols-[26rem_1fr_1fr_1fr_1fr] lg:gap-x-5";

/** Same podium language as the category board: a left rail, not a tinted row. */
function podiumRail(rank: number): string {
  if (rank === 1) return "shadow-[inset_3px_0_0_var(--yellow)]";
  if (rank <= 3) return "shadow-[inset_3px_0_0_var(--yellow-soft)]";
  return "";
}

function RankBadge({ rank }: { rank: number }) {
  const podium = rank <= 3;
  return (
    <span
      className={`num inline-flex h-7 min-w-[1.75rem] items-center justify-center px-1 font-mono text-sm ${
        podium
          ? "rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] font-semibold text-[var(--text)]"
          : "text-[var(--text-muted)]"
      }`}
    >
      #{rank}
    </span>
  );
}

/**
 * Same shape as the category board's appearance column: a fixed-width bar sitting
 * right next to its own number. A flex-1 bar that stretches the column instead
 * floats far from the value and stops reading as that value's bar.
 */
function MentionRail({ rate }: { rate: number }) {
  return (
    <span className="inline-flex items-center justify-end gap-2.5">
      <span
        aria-hidden
        className="hidden h-[3px] w-14 overflow-hidden rounded-full bg-[var(--border)] sm:block"
      >
        <span
          className="block h-full rounded-full bg-[var(--yellow-soft)] transition-colors group-hover:bg-[var(--yellow)]"
          style={{ width: `${Math.min(100, Math.max(3, rate * 100))}%` }}
        />
      </span>
      <span className="num font-mono text-[var(--text-secondary)]">
        {(rate * 100).toFixed(0)}%
      </span>
    </span>
  );
}

function sortedCategories(
  product: CompanyPageData["products"][number],
  sortKey: CompanyProductSortKey,
  categoryNameOf: (slug: string) => string
) {
  return [...product.categories].sort((a, b) => {
    if (sortKey === "score") return b.score - a.score || a.slug.localeCompare(b.slug);
    if (sortKey === "category") {
      const nameDiff = categoryNameOf(a.slug).localeCompare(categoryNameOf(b.slug));
      return nameDiff !== 0 ? nameDiff : a.slug.localeCompare(b.slug);
    }
    return a.rank - b.rank || a.slug.localeCompare(b.slug);
  });
}

function DeltaBadge({ delta }: { delta: RankDelta }) {
  const { m } = useI18n();
  if (delta.kind === "new")
    return (
      <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--card-hover)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
        {m.common.new}
      </span>
    );
  if (delta.kind === "up")
    return <span className="font-mono text-xs font-medium text-[var(--green)]">↑{delta.spots}</span>;
  if (delta.kind === "down")
    return <span className="font-mono text-xs font-medium text-[var(--red)]">↓{delta.spots}</span>;
  return <span className="font-mono text-xs text-[var(--text-muted)]">—</span>;
}

export function CompanyPageContent({
  data,
  fromBrandSlug,
  backHref = "/rankings",
  backCategorySlug = null,
}: Props) {
  const { m } = useI18n();
  const weekLabel = formatWeekLabel(m, data.week);
  const [sortKey, setSortKey] = useState<CompanyProductSortKey>("rank");
  const categoryNameOf = (slug: string) => getCategoryMessages(m, slug)?.name ?? slug;

  const hasProducts = data.products.length > 0;
  const sorted = hasProducts
    ? sortCompanyProducts(data.products, sortKey, categoryNameOf, fromBrandSlug)
    : [];
  const summary = data.summary;

  const backLabel = fromBrandSlug
    ? (data.products.find((p) => p.slug === fromBrandSlug)?.name ??
      data.lastSeen?.products.find((p) => p.slug === fromBrandSlug)?.name ??
      m.common.allRankings)
    : backCategorySlug
      ? (getCategoryMessages(m, backCategorySlug)?.name ?? m.common.categoryRankings)
      : m.common.allRankings;

  return (
    <>
      <Link
        href={backHref}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path
            d="M9 3L4 7l5 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {backLabel}
      </Link>

      <div className="space-y-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {m.common.company}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{data.name}</h1>
          <p className="mt-1.5 font-mono text-xs text-[var(--text-muted)]">
            {m.company.lastUpdated(weekLabel)}
          </p>
          <p className="mt-3 max-w-2xl text-sm text-[var(--text-secondary)]">{m.company.note}</p>
        </div>

        {!hasProducts ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm text-[var(--text)]">{m.company.emptyProducts}</p>
              <p className="max-w-2xl text-sm text-[var(--text-muted)]">
                {m.company.emptyProductsHint}
              </p>
            </div>

            {data.lastSeen && (
              <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 sm:px-5">
                  <h2 className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    {m.company.lastSeenTitle(formatWeekLabel(m, data.lastSeen.week))}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">{m.company.lastSeenHint}</p>
                </div>
                {data.lastSeen.products.map((product, index) => (
                  <div
                    key={product.slug}
                    className={index > 0 ? "border-t border-[var(--border)]" : ""}
                  >
                    <Link
                      prefetch={false}
                      href={`/brand/${product.slug}`}
                      className="flex items-baseline justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--card-hover)] sm:px-5"
                    >
                      <span className="min-w-0 truncate text-sm font-semibold text-[var(--text)]">
                        {product.name}
                      </span>
                      <span className="inline-flex shrink-0 items-center rounded-md border border-[var(--border)] bg-[var(--card-hover)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                        {m.common.out}
                      </span>
                    </Link>
                    {sortedCategories(product, "rank", categoryNameOf).map((category) => (
                      <div
                        key={category.slug}
                        className="flex items-baseline justify-between gap-3 border-t border-[var(--border)] px-4 py-2.5 text-sm sm:px-5"
                      >
                        <Link
                          href={`/category/${category.slug}`}
                          className="min-w-0 truncate pl-3 text-[var(--text-secondary)] transition-colors hover:text-[var(--text)]"
                        >
                          {categoryNameOf(category.slug)}
                        </Link>
                        <span className="shrink-0 font-mono tabular-nums text-[var(--text-muted)]">
                          #{category.rank}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </section>
            )}

            <Link
              href="/rankings"
              className="inline-flex text-sm font-medium text-[var(--text)] underline decoration-[var(--border)] underline-offset-[3px] transition-colors hover:decoration-[var(--text-muted)]"
            >
              {m.company.emptyProductsCta}
            </Link>
          </div>
        ) : (
          <>
            {/* Three oversized cells for "2 / 3 / #1" read as empty boxes. The same
                facts fit one highlight line, matching the category board's lead. */}
            {summary && (
              <section className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-3.5 sm:px-6">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                    <span
                      aria-hidden
                      className="mr-2 inline-block h-1.5 w-1.5 -translate-y-[2px] rounded-full bg-[var(--yellow)]"
                    />
                    <Link
                      prefetch={false}
                      href={`/brand/${summary.bestProduct.slug}`}
                      className="font-medium text-[var(--text)] underline decoration-transparent underline-offset-[3px] transition-colors hover:decoration-[var(--text-muted)]"
                    >
                      {summary.bestProduct.name}
                    </Link>
                    {m.company.summaryLeadSuffix(
                      summary.bestProduct.rank,
                      categoryNameOf(summary.bestProduct.categorySlug)
                    )}
                  </p>
                  {summary.biggestRiser && (
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                      <span className="mr-2 font-mono text-xs font-medium text-[var(--green)]">
                        ↑{summary.biggestRiser.spots}
                      </span>
                      <Link
                        prefetch={false}
                        href={`/brand/${summary.biggestRiser.slug}`}
                        className="font-medium text-[var(--text)] underline decoration-transparent underline-offset-[3px] transition-colors hover:decoration-[var(--text-muted)]"
                      >
                        {summary.biggestRiser.name}
                      </Link>
                      {m.company.summaryRiserSuffix(
                        summary.biggestRiser.spots,
                        categoryNameOf(summary.biggestRiser.categorySlug)
                      )}
                    </p>
                  )}
                </div>
                <p className="shrink-0 font-mono text-xs tabular-nums text-[var(--text-muted)]">
                  {m.company.summaryCounts(summary.productCount, summary.categoryCount)}
                </p>
              </section>
            )}

            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  {m.company.productsTitle}
                </h2>
                {data.products.length > 1 && (
                  <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span>{m.company.sortBy}</span>
                    <select
                      value={sortKey}
                      onChange={(event) =>
                        setSortKey(event.target.value as CompanyProductSortKey)
                      }
                      className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-xs font-medium text-[var(--text)]"
                    >
                      <option value="rank">{m.company.sortRank}</option>
                      <option value="score">{m.company.sortScore}</option>
                      <option value="category">{m.company.sortCategory}</option>
                    </select>
                  </label>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
                <div
                  className={`${METRICS_GRID} border-b border-[var(--border)] bg-[var(--bg-elevated)] py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]`}
                >
                  <div>{m.company.category}</div>
                  <div className="text-right">#</div>
                  <div className="text-right">{m.common.score}</div>
                  <div className="text-right">{m.company.mention}</div>
                  <div className="text-right">{m.common.delta}</div>
                </div>

                {sorted.map((product, index) => {
                  const pinned = product.slug === fromBrandSlug;
                  const bestRank = Math.min(...product.categories.map((c) => c.rank));
                  const categories = sortedCategories(product, sortKey, categoryNameOf);
                  // A product in one category was two rows for a single data
                  // point: an empty header band, then the values. Fold it flat.
                  if (categories.length === 1) {
                    const category = categories[0];
                    const delta = categoryRankDelta(
                      category,
                      product.slug,
                      data.hasPrevWeekData
                    );
                    return (
                      <div
                        key={product.slug}
                        className={`${METRICS_GRID} group py-3 text-sm transition-colors hover:bg-[var(--card-hover)] ${
                          index > 0 ? "border-t border-[var(--border)]" : ""
                        } ${pinned ? "bg-[var(--bg-elevated)]" : ""} ${podiumRail(bestRank)}`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <RankBadge rank={bestRank} />
                          <Link
                            prefetch={false}
                            href={`/brand/${product.slug}`}
                            className="min-w-0 truncate text-[15px] font-semibold tracking-[-0.01em] text-[var(--text)] underline decoration-transparent underline-offset-[3px] transition-colors hover:decoration-[var(--text-muted)]"
                          >
                            {product.name}
                          </Link>
                          <Link
                            href={`/category/${category.slug}`}
                            className="hidden min-w-0 truncate text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)] sm:block"
                          >
                            {categoryNameOf(category.slug)}
                          </Link>
                        </div>
                        <div className="text-right font-mono tabular-nums text-[var(--text-secondary)]">
                          #{category.rank}
                        </div>
                        <div className="text-right font-mono font-semibold tabular-nums text-[var(--text)]">
                          {category.score.toFixed(1)}
                        </div>
                        <div className="text-right">
                          <MentionRail rate={category.mentionFrequency} />
                        </div>
                        <div className="flex justify-end">
                          <DeltaBadge delta={delta} />
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={product.slug}
                      className={index > 0 ? "border-t border-[var(--border)]" : ""}
                    >
                      {/* Group header for a multi-category product: tinted so an
                          empty metrics area reads as a heading, not a blank row. */}
                      <Link
                        prefetch={false}
                        href={`/brand/${product.slug}`}
                        className={`flex items-center gap-2.5 bg-[var(--bg-elevated)] px-4 py-3 transition-colors hover:bg-[var(--card-hover)] sm:px-5 ${
                          pinned ? "ring-1 ring-inset ring-[var(--border-hover)]" : ""
                        } ${podiumRail(bestRank)}`}
                      >
                        <RankBadge rank={bestRank} />
                        <span className="min-w-0 truncate text-[15px] font-semibold tracking-[-0.01em] text-[var(--text)]">
                          {product.name}
                        </span>
                        <span className="shrink-0 text-xs text-[var(--text-muted)]">
                          {m.company.categoryCount(product.categories.length)}
                        </span>
                      </Link>
                      {categories.map((category) => {
                        const delta = categoryRankDelta(
                          category,
                          product.slug,
                          data.hasPrevWeekData
                        );
                        return (
                          <div
                            key={category.slug}
                            className={`${METRICS_GRID} group border-t border-[var(--border)] py-2.5 text-sm transition-colors hover:bg-[var(--card-hover)]`}
                          >
                            <div className="min-w-0 pl-[2.375rem]">
                              <Link
                                href={`/category/${category.slug}`}
                                className="block truncate text-[var(--text-secondary)] transition-colors hover:text-[var(--text)]"
                              >
                                {categoryNameOf(category.slug)}
                              </Link>
                            </div>
                            <div className="text-right font-mono tabular-nums text-[var(--text-secondary)]">
                              #{category.rank}
                            </div>
                            <div className="text-right font-mono font-semibold tabular-nums text-[var(--text)]">
                              {category.score.toFixed(1)}
                            </div>
                            <div className="text-right">
                              <MentionRail rate={category.mentionFrequency} />
                            </div>
                            <div className="flex justify-end">
                              <DeltaBadge delta={delta} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
