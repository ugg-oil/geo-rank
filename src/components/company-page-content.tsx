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
};

/** Shared across product cards so # / score / frequency columns line up. */
const PRODUCT_METRICS_GRID =
  "grid grid-cols-[minmax(0,1fr)_3.5rem_4rem_5.5rem_2.5rem] gap-x-2 px-3 sm:grid-cols-[minmax(0,1fr)_3.5rem_4.5rem_7rem_2.75rem]";

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

export function CompanyPageContent({ data, fromBrandSlug }: Props) {
  const { m } = useI18n();
  const weekLabel = formatWeekLabel(m, data.week);
  const [sortKey, setSortKey] = useState<CompanyProductSortKey>("rank");
  const categoryNameOf = (slug: string) => getCategoryMessages(m, slug)?.name ?? slug;

  const hasProducts = data.products.length > 0;
  const sorted = hasProducts
    ? sortCompanyProducts(data.products, sortKey, categoryNameOf, fromBrandSlug)
    : [];
  const summary = data.summary;

  return (
    <>
      <Link
        href="/rankings"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
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
        {m.common.allRankings}
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
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-muted)]">{m.company.emptyProducts}</p>
            <Link
              href="/rankings"
              className="inline-flex text-sm font-medium text-[var(--text)] underline decoration-[var(--border)] underline-offset-[3px] transition-colors hover:decoration-[var(--text-muted)]"
            >
              {m.company.emptyProductsCta}
            </Link>
          </div>
        ) : (
          <>
            {summary && (
              <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 sm:p-6">
                <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  {m.company.summaryTitle}
                </h2>
                <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                  <li>
                    {m.company.productCount(summary.productCount)}
                    {" · "}
                    {m.company.categoryCount(summary.categoryCount)}
                  </li>
                  <li>
                    <Link
                      prefetch={false}
                      href={`/brand/${summary.bestProduct.slug}`}
                      className="font-medium text-[var(--text)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                      {m.company.bestProduct(
                        summary.bestProduct.name,
                        summary.bestProduct.rank,
                        categoryNameOf(summary.bestProduct.categorySlug)
                      )}
                    </Link>
                  </li>
                  {summary.biggestRiser && (
                    <li>
                      <Link
                        prefetch={false}
                        href={`/brand/${summary.biggestRiser.slug}`}
                        className="font-medium text-[var(--text)] hover:text-[var(--text-secondary)] transition-colors"
                      >
                        {m.company.biggestRiser(
                          summary.biggestRiser.name,
                          summary.biggestRiser.spots,
                          categoryNameOf(summary.biggestRiser.categorySlug)
                        )}
                      </Link>
                    </li>
                  )}
                </ul>
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

              <div className="space-y-4">
                {sorted.map((product) => (
                  <section
                    key={product.slug}
                    className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6"
                  >
                    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                      <Link
                        prefetch={false}
                        href={`/brand/${product.slug}`}
                        className="text-base font-semibold text-[var(--text)] hover:text-[var(--text-secondary)] transition-colors"
                      >
                        {product.name}
                      </Link>
                      <span className="text-xs text-[var(--text-muted)]">
                        {m.company.viewBrand}
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                      <div
                        className={`${PRODUCT_METRICS_GRID} border-b border-[var(--border)] bg-[var(--bg-elevated)] py-2 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]`}
                      >
                        <div className="text-left">{m.company.category}</div>
                        <div className="text-right">#</div>
                        <div className="text-right">{m.common.score}</div>
                        <div className="text-right">{m.company.mentionFrequency}</div>
                        <div className="text-right">{m.common.delta}</div>
                      </div>
                      {product.categories.map((category) => {
                        const categoryName = categoryNameOf(category.slug);
                        const delta = categoryRankDelta(
                          category,
                          product.slug,
                          data.hasPrevWeekData
                        );
                        return (
                          <div
                            key={category.slug}
                            className={`${PRODUCT_METRICS_GRID} border-b border-[var(--border)] py-2.5 text-sm last:border-b-0`}
                          >
                            <div className="min-w-0">
                              <Link
                                href={`/category/${category.slug}`}
                                className="font-medium text-[var(--text)] hover:text-[var(--text-secondary)] transition-colors"
                              >
                                {categoryName}
                              </Link>
                            </div>
                            <div className="text-right font-mono tabular-nums text-[var(--text)]">
                              #{category.rank}
                            </div>
                            <div className="text-right font-mono tabular-nums text-[var(--text)]">
                              {category.score.toFixed(1)}
                            </div>
                            <div className="text-right font-mono tabular-nums text-[var(--text-secondary)]">
                              {(category.mentionFrequency * 100).toFixed(0)}%
                            </div>
                            <div className="flex justify-end">
                              <DeltaBadge delta={delta} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
