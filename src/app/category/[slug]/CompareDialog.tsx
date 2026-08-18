"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  ASCENDING_SORT_KEYS,
  compareBestValue,
  compareMetricKeys,
  type SortKey,
} from "@/lib/category-board-view";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { LeaderboardRow } from "@/lib/leaderboard-data";

/** Worst average rank the bar scale accounts for — boards are Top 20 but an
    avg rank past #10 already reads as "off the shortlist". */
const AVG_RANK_FLOOR = 10;

function formatMetric(key: SortKey, row: LeaderboardRow): string {
  const value = row[key];
  if (value === null) return "—";
  if (key === "score" || key === "avgRank") return value.toFixed(1);
  return `${(value * 100).toFixed(0)}%`;
}

/**
 * Bars run on each metric's absolute scale rather than being normalised across
 * the compared rows: with two products a relative scale always renders the
 * runner-up as an empty bar, which reads as "zero" instead of "slightly lower".
 */
function barFraction(key: SortKey, value: number): number {
  const raw =
    key === "score"
      ? value / 100
      : key === "avgRank"
        ? 1 - (value - 1) / (AVG_RANK_FLOOR - 1)
        : value;
  return Math.min(1, Math.max(0, raw));
}

/** Signed gap to the best value, in the metric's own unit. */
function formatGap(key: SortKey, value: number, best: number): string {
  const diff = value - best;
  if (key === "score" || key === "avgRank") {
    return `${diff > 0 ? "+" : "−"}${Math.abs(diff).toFixed(1)}`;
  }
  return `${diff > 0 ? "+" : "−"}${Math.abs(diff * 100).toFixed(0)}pp`;
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
    direction: ASCENDING_SORT_KEYS.has(key)
      ? m.category.compareLowerBetter
      : m.category.compareHigherBetter,
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
      <div className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-t-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-raised)] sm:rounded-2xl">
        {/* Sticky so the metric labels stay anchored while a 3-way compare scrolls. */}
        <div className="surface-head sticky top-0 z-10 flex items-start justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <h2 className="panel-title text-sm font-semibold text-[var(--text)]">
              {m.category.compareTitle}
            </h2>
            <p className="mt-1.5 font-mono text-[11px] text-[var(--text-muted)]">
              {m.category.compareSubtitle(boardLabel, periodStart)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text)]"
          >
            {m.category.compareClose}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="w-[30%] px-5 py-4 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  {m.common.product}
                </th>
                {rows.map((row) => (
                  <th
                    key={row.brandId}
                    className="border-l border-[var(--border)] px-5 py-4 text-left align-top"
                  >
                    <span className="num inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[10px] font-normal text-[var(--text-muted)]">
                      #{row.rank}
                    </span>
                    <Link
                      href={`/brand/${row.brandSlug}?from=${encodeURIComponent(sourcePath)}`}
                      className="mt-1.5 block truncate text-[15px] font-semibold text-[var(--text)] underline decoration-transparent underline-offset-[3px] transition-colors hover:decoration-[var(--text-muted)]"
                    >
                      {row.brandName}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => {
                const best = compareBestValue(metric.key, rows);
                const values = rows
                  .map((row) => row[metric.key])
                  .filter((value): value is number => value !== null);
                // Everyone at 100% coverage is a tie, not four winners — the old
                // dialog stamped "Best" on every cell in that case.
                const tied =
                  values.length > 1 && values.every((value) => value === values[0]);
                return (
                  <tr
                    key={metric.key}
                    className="border-b border-[var(--border)] last:border-b-0"
                  >
                    <th className="px-5 py-4 text-left align-top">
                      <span className="block text-[13px] font-medium text-[var(--text-secondary)]">
                        {metric.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-normal text-[var(--text-muted)]">
                        {metric.direction}
                      </span>
                    </th>
                    {rows.map((row) => {
                      const value = row[metric.key];
                      const isBest =
                        !tied && best !== null && value === best && rows.length > 1;
                      const showGap =
                        !tied && !isBest && value !== null && best !== null;
                      return (
                        <td
                          key={row.brandId}
                          className={`border-l border-[var(--border)] px-5 py-4 align-top ${
                            isBest ? "bg-[var(--bg-elevated)]" : ""
                          }`}
                        >
                          <span className="flex items-baseline gap-2">
                            <span
                              className={`num font-mono text-[17px] leading-none ${
                                isBest
                                  ? "font-semibold text-[var(--text)]"
                                  : "text-[var(--text-secondary)]"
                              }`}
                            >
                              {formatMetric(metric.key, row)}
                            </span>
                            {isBest && (
                              <span className="shrink-0 rounded-md bg-[var(--yellow)]/14 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--yellow)]">
                                {m.category.compareBest}
                              </span>
                            )}
                            {tied && (
                              <span className="shrink-0 rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                                {m.category.compareTie}
                              </span>
                            )}
                            {showGap && (
                              <span className="num shrink-0 font-mono text-[11px] text-[var(--text-muted)]">
                                {formatGap(metric.key, value, best)}
                              </span>
                            )}
                          </span>
                          {value !== null && (
                            <span
                              aria-hidden
                              className="mt-2.5 block h-[3px] overflow-hidden rounded-full bg-[var(--border)]"
                            >
                              <span
                                className="block h-full rounded-full transition-[width] duration-200"
                                style={{
                                  width: `${barFraction(metric.key, value) * 100}%`,
                                  background: isBest
                                    ? "var(--yellow)"
                                    : "var(--text-muted)",
                                }}
                              />
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

        <p className="border-t border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
          {m.category.compareScaleNote}
        </p>
      </div>
    </div>
  );
}
