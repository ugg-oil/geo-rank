"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  compareBestValue,
  compareMetricKeys,
  type SortKey,
} from "@/lib/category-board-view";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { LeaderboardRow } from "@/lib/leaderboard-data";

function formatMetric(key: SortKey, row: LeaderboardRow): string {
  const value = row[key];
  if (value === null) return "—";
  if (key === "score" || key === "avgRank") return value.toFixed(1);
  return `${(value * 100).toFixed(0)}%`;
}

export function CompareDialog({
  rows,
  boardLabel,
  periodStart,
  sourcePath,
  showCoverage,
  onClose,
}: {
  rows: LeaderboardRow[];
  boardLabel: string;
  periodStart: string;
  sourcePath: string;
  /** Coverage exists on the Overall board only (P2-2). */
  showCoverage: boolean;
  onClose: () => void;
}) {
  const { m } = useI18n();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const metricLabel: Record<SortKey, string> = {
    score: m.common.score,
    appearanceRate: m.common.appearance,
    avgRank: m.common.avgRank,
    modelCoverage: m.common.coverage,
  };
  const metrics = compareMetricKeys(showCoverage).map((key) => ({
    key,
    label: metricLabel[key],
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={m.category.compareTitle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-t-2xl border border-[var(--border)] bg-[var(--card)] sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--text)]">
              {m.category.compareTitle}
            </h2>
            <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">
              {m.category.compareSubtitle(boardLabel, periodStart)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text)]"
          >
            {m.category.compareClose}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  {m.common.product}
                </th>
                {rows.map((row) => (
                  <th key={row.brandId} className="px-5 py-3 text-right">
                    <Link
                      href={`/brand/${row.brandSlug}?from=${encodeURIComponent(sourcePath)}`}
                      className="font-medium text-[var(--text)] underline decoration-[var(--border)] underline-offset-[3px] transition-colors hover:decoration-[var(--text-muted)]"
                    >
                      {row.brandName}
                    </Link>
                    <div className="mt-0.5 font-mono text-[11px] font-normal text-[var(--text-muted)]">
                      #{row.rank}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => {
                const best = compareBestValue(metric.key, rows);
                return (
                  <tr key={metric.key} className="border-b border-[var(--border)] last:border-b-0">
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                      {metric.label}
                    </th>
                    {rows.map((row) => {
                      const value = row[metric.key];
                      const isBest = best !== null && value === best && rows.length > 1;
                      return (
                        <td
                          key={row.brandId}
                          className={`px-5 py-3 text-right font-mono tabular-nums ${
                            isBest
                              ? "font-semibold text-[var(--text)]"
                              : "text-[var(--text-secondary)]"
                          }`}
                        >
                          {formatMetric(metric.key, row)}
                          {isBest && (
                            <span className="ml-2 rounded-md bg-[var(--yellow)]/14 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--yellow)]">
                              {m.category.compareBest}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
