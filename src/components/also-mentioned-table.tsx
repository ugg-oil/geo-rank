"use client";

import Link from "next/link";
import type { AlsoMentionedRow } from "@/lib/leaderboard-data";
import { useI18n } from "@/lib/i18n/use-i18n";

export function AlsoMentionedTable({
  rows,
  sourcePath,
  periodStart,
}: {
  rows: AlsoMentionedRow[];
  sourcePath: string;
  /** Period start date (YYYY-MM-DD) of the board currently on screen. */
  periodStart: string;
}) {
  const { m } = useI18n();
  if (rows.length === 0) return null;

  return (
    <div className="surface mt-6 overflow-hidden">
      <div className="surface-head flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
        <div className="min-w-0">
          <h2 className="panel-title text-sm font-semibold text-[var(--text)]">
            {m.category.alsoMentionedTitle}
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-muted)]">
            {m.category.alsoMentionedLead(periodStart)}
          </p>
        </div>
        <span className="num rounded-full border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]">
          {rows.length}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--card)]">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                {m.common.product}
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                {m.category.alsoMentionedMention}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.brandId}
                className="group border-b border-[var(--border)] bg-[var(--card)] transition-colors last:border-b-0 hover:bg-[var(--card-hover)]"
              >
                <td className="px-4 py-3.5">
                  {row.hasBrandPage ? (
                    <Link
                      prefetch={false}
                      href={`/brand/${row.brandSlug}?from=${encodeURIComponent(sourcePath)}`}
                      className="font-medium text-[var(--text)] underline decoration-transparent decoration-2 underline-offset-[4px] transition-colors hover:decoration-[var(--text-muted)] group-hover:decoration-[var(--border-hover)]"
                    >
                      {row.brandName}
                    </Link>
                  ) : (
                    <span className="font-medium text-[var(--text)]">{row.brandName}</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span className="inline-flex items-center justify-end gap-2.5">
                    {/* Absolute 0–100% scale, so the track itself is the
                        reference: these are all tail brands and the stubby bars
                        say so. Scaling to the widest row in this table instead
                        rendered a 21% rate as a full bar. */}
                    <span
                      aria-hidden
                      className="hidden h-[3px] w-24 overflow-hidden rounded-full bg-[var(--border)] sm:block"
                    >
                      <span
                        className="block h-full rounded-full bg-[var(--yellow-soft)] transition-colors group-hover:bg-[var(--yellow)]"
                        style={{
                          width: `${Math.min(100, Math.max(2, row.mentionRate * 100))}%`,
                        }}
                      />
                    </span>
                    <span className="num font-mono text-[var(--text-secondary)]">
                      {(row.mentionRate * 100).toFixed(0)}%
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
