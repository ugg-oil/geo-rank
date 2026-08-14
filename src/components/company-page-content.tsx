"use client";

import Link from "next/link";
import type { CompanyPageData } from "@/lib/company-page";
import { formatWeekLabel, getCategoryMessages } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/use-i18n";

type Props = {
  data: CompanyPageData;
};

export function CompanyPageContent({ data }: Props) {
  const { m } = useI18n();
  const weekLabel = formatWeekLabel(m, data.week);

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

        <div>
          <h2 className="mb-4 text-lg font-semibold text-[var(--text)]">
            {m.company.productsTitle}
          </h2>
          {data.products.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">{m.company.emptyProducts}</p>
          ) : (
            <div className="space-y-4">
              {data.products.map((product) => (
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
                    <span className="text-xs text-[var(--text-muted)]">{m.company.viewBrand}</span>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                            {m.company.category}
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                            #
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                            {m.common.score}
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                            {m.company.mentionFrequency}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.categories.map((category) => {
                          const categoryName =
                            getCategoryMessages(m, category.slug)?.name ?? category.slug;
                          return (
                            <tr
                              key={category.slug}
                              className="border-b border-[var(--border)] last:border-b-0"
                            >
                              <td className="px-3 py-2.5">
                                <Link
                                  href={`/category/${category.slug}`}
                                  className="font-medium text-[var(--text)] hover:text-[var(--text-secondary)] transition-colors"
                                >
                                  {categoryName}
                                </Link>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono text-[var(--text)]">
                                #{category.rank}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono text-[var(--text)]">
                                {category.score.toFixed(1)}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono text-[var(--text-secondary)]">
                                {(category.mentionFrequency * 100).toFixed(0)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
