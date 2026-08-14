"use client";

import Link from "next/link";
import type { AlsoMentionedRow } from "@/lib/leaderboard-data";
import { useI18n } from "@/lib/i18n/use-i18n";

export function AlsoMentionedTable({
  rows,
  sourcePath,
}: {
  rows: AlsoMentionedRow[];
  sourcePath: string;
}) {
  const { m } = useI18n();
  if (rows.length === 0) return null;

  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-[var(--border)]">
      <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--text)]">
          {m.category.alsoMentionedTitle}
        </h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{m.category.alsoMentionedLead}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                {m.common.product}
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
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
                      className="font-medium text-[var(--text)] underline decoration-[var(--border)] underline-offset-[3px] transition-colors hover:decoration-[var(--text-muted)] group-hover:decoration-[var(--border-hover)]"
                    >
                      {row.brandName}
                    </Link>
                  ) : (
                    <span className="font-medium text-[var(--text)]">{row.brandName}</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right font-mono text-[var(--text-secondary)]">
                  {(row.mentionRate * 100).toFixed(0)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
