"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { BrandTrendCharts } from "@/components/brand-trend-charts";
import type { BrandHistoryPoint } from "@/lib/brand-history-data";
import type { BrandPageData } from "@/lib/brand-page";
import { buildWhyCards } from "@/lib/brand-why";
import { computeTrendLabel, type TrendLabel } from "@/lib/brand-trend-label";
import { engineLabel } from "@/lib/constants";
import { formatWeekLabel, getCategoryMessages } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { SimilarBrandCandidate } from "@/lib/similar-brands";
import { toBrandSlug } from "@/lib/brand-slug";
import { getRankDelta, type RankDelta } from "@/lib/rank-change";
import { LeadForm } from "@/components/lead-form";

type SortKey = "score" | "rank" | "mention";

/**
 * Badge list must never drop engines that have ranks (why-text uses `category.engines`).
 * Union collectedEngines with ranked keys; ranked engines first so unranked ones don't hide them.
 */
function resolveCategoryEngineKeys(
  collectedEngines: readonly string[],
  engines: BrandPageData["categories"][number]["engines"]
): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const engine of collectedEngines) {
    if (seen.has(engine)) continue;
    seen.add(engine);
    ordered.push(engine);
  }
  for (const engine of Object.keys(engines)) {
    if (seen.has(engine)) continue;
    seen.add(engine);
    ordered.push(engine);
  }
  const withData: string[] = [];
  const withoutData: string[] = [];
  for (const engine of ordered) {
    if (engines[engine]) withData.push(engine);
    else withoutData.push(engine);
  }
  withData.sort((a, b) => {
    const rankDelta = engines[a]!.rank - engines[b]!.rank;
    return rankDelta !== 0 ? rankDelta : a.localeCompare(b);
  });
  return [...withData, ...withoutData];
}

function DeltaBadge({ delta }: { delta: RankDelta }) {
  const { m } = useI18n();
  if (delta.kind === "new")
    return (
      <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--card-hover)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
        {m.common.new}
      </span>
    );
  if (delta.kind === "up")
    return (
      <span className="font-mono text-sm font-medium text-[var(--green)]">↑{delta.spots}</span>
    );
  if (delta.kind === "down")
    return <span className="font-mono text-sm font-medium text-[var(--red)]">↓{delta.spots}</span>;
  return <span className="font-mono text-sm text-[var(--text-muted)]">—</span>;
}

/**
 * Missing rank has two causes and they must not read the same: the engine ran
 * but did not list this brand (unranked), vs the engine has no valid data for
 * the period (noData, per methodology).
 */
function EngineBadge({
  engine,
  rank,
  score,
  collected,
  href,
}: {
  engine: string;
  rank?: number;
  score?: number;
  collected: boolean;
  href: string;
}) {
  const { m } = useI18n();
  const hasRank = rank != null && score != null;
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 transition-colors hover:bg-[var(--card-hover)]"
    >
      <span className="text-xs font-medium text-[var(--text-secondary)]">
        {engineLabel(engine)}
      </span>
      <span className="font-mono text-xs text-[var(--text-muted)]">
        {hasRank
          ? `#${rank} · ${score.toFixed(1)}`
          : collected
            ? m.brand.engineUnranked
            : m.common.noData}
      </span>
    </Link>
  );
}

function TrendBadge({ label }: { label: TrendLabel }) {
  const { m } = useI18n();
  const text =
    label === "Rising"
      ? m.brand.trendRising
      : label === "Declining"
        ? m.brand.trendDeclining
        : m.brand.trendStable;
  const color =
    label === "Rising"
      ? "text-[var(--green)] border-[var(--green)]/30"
      : label === "Declining"
        ? "text-[var(--red)] border-[var(--red)]/30"
        : "text-[var(--text-secondary)] border-[var(--border)]";
  return (
    <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${color}`}>{text}</span>
  );
}

const WHY_TONE_DOT: Record<"positive" | "negative" | "neutral", string> = {
  positive: "bg-[var(--green)]",
  negative: "bg-[var(--red)]",
  neutral: "bg-[var(--text-muted)]",
};

/** Column inside the Why block: no nested card, separated by grid dividers. */
function WhyColumn({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "positive" | "negative" | "neutral";
  children: ReactNode;
}) {
  return (
    <div className="px-5 py-3 sm:px-6">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${WHY_TONE_DOT[tone]}`} />
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
          {title}
        </p>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/** One engine line: name + rank kept adjacent, reason as muted sub-label. */
function WhyEngineRow({
  engine,
  rank,
  reason,
}: {
  engine: string;
  rank: number | null;
  reason: string;
}) {
  return (
    <li>
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium text-[var(--text)]">{engineLabel(engine)}</span>
        <span className="font-mono text-xs tabular-nums text-[var(--text-muted)]">
          {rank == null ? "—" : `#${rank}`}
        </span>
      </div>
      <p className="mt-0.5 text-xs leading-5 text-[var(--text-muted)]">{reason}</p>
    </li>
  );
}

/** Cell of the headline stat bar: equal share of the full width, value dominant. */
function StatCell({ label, value }: { label: ReactNode; value: string }) {
  return (
    <div className="px-5 py-3.5 sm:px-6">
      <p className="flex flex-wrap items-baseline gap-x-1.5 text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className="mt-1.5 font-mono text-2xl font-semibold leading-none tabular-nums text-[var(--text)]">
        {value}
      </p>
    </div>
  );
}

function CategoryCard({
  category,
  history,
  collectedEngines,
  similar,
  highlight,
  compare,
  showCompare,
  periodWeek,
}: {
  category: BrandPageData["categories"][number];
  history?: BrandHistoryPoint[];
  collectedEngines: readonly string[];
  similar: SimilarBrandCandidate[];
  highlight: "top" | "bottom" | null;
  compare: { rankDelta: number; scoreDelta: number; bestRank: number; bestScore: number };
  showCompare: boolean;
  periodWeek: string;
}) {
  const { m } = useI18n();
  const categoryName = getCategoryMessages(m, category.slug)?.name ?? category.slug;
  const collectedSet = new Set(collectedEngines);
  const engineEntries = resolveCategoryEngineKeys(collectedEngines, category.engines).map(
    (engine) => ({
      engine,
      collected: collectedSet.has(engine),
      ...category.engines[engine],
    })
  );
  const trend = history ? computeTrendLabel(history) : null;
  const ring =
    highlight === "top"
      ? "ring-1 ring-[var(--green)]/40"
      : highlight === "bottom"
        ? "ring-1 ring-[var(--red)]/30"
        : "";

  const prevRanks =
    category.prevRank != null ? { self: category.prevRank } : ({} as Record<string, number>);
  const delta = getRankDelta(category.rank, prevRanks, "self", Boolean(category.hasPrevPeriod));

  const periodDate = formatWeekLabel(m, periodWeek);
  const fromBestEngine = category.rankSource === "best_engine" && category.bestEngine;
  const categoryHref = fromBestEngine
    ? `/category/${category.slug}?engine=${encodeURIComponent(category.bestEngine!)}&week=${encodeURIComponent(periodDate)}`
    : `/category/${category.slug}?week=${encodeURIComponent(periodDate)}`;
  const engineHref = (engine: string) =>
    `/category/${category.slug}?engine=${encodeURIComponent(engine)}&week=${encodeURIComponent(periodDate)}`;

  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 ${ring}`}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link
            href={categoryHref}
            className="text-base font-semibold text-[var(--text)] transition-colors hover:text-[var(--text-secondary)]"
          >
            {categoryName}
          </Link>
          {trend && <TrendBadge label={trend} />}
          <DeltaBadge delta={delta} />
        </div>
        <div className="shrink-0 text-right">
          <span className="font-mono text-lg font-semibold text-[var(--text)]">
            {fromBestEngine
              ? `${engineLabel(category.bestEngine!)} #${category.rank}`
              : `#${category.rank}`}
          </span>
          {fromBestEngine && (
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              {m.brand.rankBestEngineNote}
            </p>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-xs text-[var(--text-muted)]">{m.common.score}</span>
          <p className="font-mono text-lg font-semibold text-[var(--text)]">
            {category.score.toFixed(1)}
          </p>
        </div>
        <div>
          <span className="text-xs text-[var(--text-muted)]">{m.brand.mentionFrequency}</span>
          <p className="font-mono text-lg font-semibold text-[var(--text)]">
            {(category.mentionFrequency * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {showCompare && (
        <div className="mb-4 space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            {m.brand.categoryCompare}
          </p>
          <div className="space-y-1.5">
            <CompareBar
              label={m.brand.vsBestRank(compare.rankDelta)}
              ratio={compare.bestRank / Math.max(category.rank, 1)}
            />
            <CompareBar
              label={m.brand.vsBestScore(compare.scoreDelta.toFixed(1))}
              ratio={category.score / Math.max(compare.bestScore, 0.0001)}
            />
          </div>
        </div>
      )}

      {engineEntries.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs text-[var(--text-muted)]">{m.brand.perEngine}</span>
          {engineEntries.map((entry) => (
            <EngineBadge
              key={entry.engine}
              engine={entry.engine}
              rank={entry.rank}
              score={entry.score}
              collected={entry.collected}
              href={engineHref(entry.engine)}
            />
          ))}
        </div>
      )}

      {history && <BrandTrendCharts points={history} />}

      {similar.length > 0 && (
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <p className="mb-2 text-xs text-[var(--text-muted)]">{m.brand.similarBrands}</p>
          <ul className="space-y-1.5">
            {similar.map((item) => (
              <li key={item.slug}>
                <Link
                  prefetch={false}
                  href={`/brand/${item.slug}`}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm transition-colors hover:bg-[var(--card-hover)]"
                >
                  <span className="font-medium text-[var(--text)]">{item.name}</span>
                  <span className="font-mono text-xs text-[var(--text-muted)]">#{item.rank}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CompareBar({ label, ratio }: { label: string; ratio: number }) {
  const width = `${Math.max(8, Math.min(100, ratio * 100))}%`;
  return (
    <div>
      <p className="mb-1 text-[11px] text-[var(--text-secondary)]">{label}</p>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        <div className="h-full rounded-full bg-[var(--text-muted)]" style={{ width }} />
      </div>
    </div>
  );
}

type Props = {
  data: BrandPageData;
  historyByCategory: Record<string, BrandHistoryPoint[]>;
  similarByCategory: Record<string, SimilarBrandCandidate[]>;
  backHref: string;
  backCategorySlug: string | null;
  evidence?: ReactNode;
};

export function BrandPageContent({
  data,
  historyByCategory,
  similarByCategory,
  backHref,
  backCategorySlug,
  evidence,
}: Props) {
  const { m } = useI18n();
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const categoryList = data.categories;

  const sorted = useMemo(() => {
    const rows = [...categoryList];
    rows.sort((a, b) => {
      if (sortKey === "score") return b.score - a.score;
      if (sortKey === "mention") return b.mentionFrequency - a.mentionFrequency;
      return a.rank - b.rank;
    });
    if (backCategorySlug) {
      const pinned = rows.findIndex((c) => c.slug === backCategorySlug);
      if (pinned > 0) {
        const [card] = rows.splice(pinned, 1);
        rows.unshift(card!);
      }
    }
    return rows;
  }, [categoryList, sortKey, backCategorySlug]);

  const bestRank = categoryList.length > 0 ? Math.min(...categoryList.map((c) => c.rank)) : 0;
  const bestScore = categoryList.length > 0 ? Math.max(...categoryList.map((c) => c.score)) : 0;
  const worstRank = categoryList.length > 0 ? Math.max(...categoryList.map((c) => c.rank)) : 0;
  const worstScore = categoryList.length > 0 ? Math.min(...categoryList.map((c) => c.score)) : 0;

  const topCategory =
    categoryList.length === 0
      ? null
      : ((backCategorySlug ? categoryList.find((c) => c.slug === backCategorySlug) : undefined) ??
        categoryList.reduce((best, c) => (c.rank < best.rank ? c : best), categoryList[0]!));

  const topCategoryName = topCategory
    ? (getCategoryMessages(m, topCategory.slug)?.name ?? topCategory.slug)
    : "";
  const collectedEngines = data.collectedEngines ?? [];
  const weekLabel = formatWeekLabel(m, data.week);

  const whyCards = topCategory
    ? buildWhyCards({
        overallRank: topCategory.rank,
        engines: topCategory.engines,
        collectedEngines,
        history: historyByCategory[topCategory.slug] ?? [],
      })
    : null;

  const backLabel = backCategorySlug
    ? (getCategoryMessages(m, backCategorySlug)?.name ?? m.common.categoryRankings)
    : m.common.allRankings;

  /**
   * Absent engines share one reason, so they collapse into a single line instead
   * of one row each. Ranked-but-weak engines stay separate: they carry a rank.
   */
  const absentEngines = (whyCards?.weaknesses ?? [])
    .filter((row) => row.kind === "absent")
    .map((row) => row.engine);
  const weakRanked = (whyCards?.weaknesses ?? []).filter(
    (row): row is Extract<typeof row, { kind: "weak" }> => row.kind === "weak"
  );

  const parentSlug = data.parentCompany ? toBrandSlug(data.parentCompany) : null;
  const parentLabel = data.parentCompany ? m.brand.companyLabel(data.parentCompany) : null;

  /** How much of the engine set actually ranks this brand — a #20 on 1 of 6 engines is not a #20 on 6. */
  const engineCoverage =
    topCategory && collectedEngines.length > 0
      ? {
          ranked: collectedEngines.filter((engine) => topCategory.engines[engine]).length,
          total: collectedEngines.length,
        }
      : null;

  const whyColumns: {
    key: string;
    title: string;
    tone: "positive" | "negative" | "neutral";
    body: ReactNode;
  }[] = [];

  if (topCategory && whyCards) {
    if (whyCards.strengths.length > 0) {
      whyColumns.push({
        key: "strengths",
        title: m.brand.whyStrengths,
        tone: "positive",
        body: (
          <ul className="space-y-3">
            {whyCards.strengths.map((row) => (
              <WhyEngineRow
                key={row.engine}
                engine={row.engine}
                rank={row.rank}
                reason={
                  row.reason === "beats_overall"
                    ? m.brand.whyReasonAheadOverall(topCategory.rank)
                    : m.brand.whyReasonBest
                }
              />
            ))}
          </ul>
        ),
      });
    }

    if (whyCards.weaknesses.length > 0) {
      whyColumns.push({
        key: "weaknesses",
        title: m.brand.whyWeaknesses,
        tone: "negative",
        body: (
          <div className="space-y-3">
            {weakRanked.length > 0 && (
              <ul className="space-y-3">
                {weakRanked.map((row) => (
                  <WhyEngineRow
                    key={row.engine}
                    engine={row.engine}
                    rank={row.rank}
                    reason={m.brand.whyReasonWeak}
                  />
                ))}
              </ul>
            )}
            {absentEngines.length > 0 && (
              <div>
                <p className="text-sm font-medium text-[var(--text)]">{m.brand.engineUnranked}</p>
                <p className="mt-0.5 text-xs leading-5 text-[var(--text-muted)]">
                  {absentEngines.map((engine) => engineLabel(engine)).join(m.common.listSeparator)}
                </p>
              </div>
            )}
          </div>
        ),
      });
    }

    if (whyCards.enginesClose) {
      whyColumns.push({
        key: "consensus",
        title: m.brand.whyConsistencyTitle,
        tone: "neutral",
        body: (
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            {m.brand.whyEnginesClose}
          </p>
        ),
      });
    }

    if (whyCards.trend) {
      whyColumns.push({
        key: "trend",
        title: m.brand.whyTrendTitle,
        tone: "neutral",
        body: (
          <div className="flex flex-wrap items-center gap-2">
            <TrendBadge label={whyCards.trend} />
            <span className="text-xs leading-5 text-[var(--text-muted)]">
              {m.brand.whyTrendHint(topCategoryName)}
            </span>
          </div>
        ),
      });
    }
  }

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
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{data.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-muted)]">
            {parentSlug && parentLabel && (
              <>
                <Link
                  prefetch={false}
                  href={`/company/${parentSlug}?from=${encodeURIComponent(`/brand/${data.slug}`)}`}
                  className="text-[var(--text-secondary)] transition-colors hover:text-[var(--text)]"
                >
                  {parentLabel}
                </Link>
                <span aria-hidden>·</span>
              </>
            )}
            <span className="font-mono">{m.brand.lastUpdated(weekLabel)}</span>
          </div>
        </div>

        {/* Headline numbers span the full width: four equal cells leave no gap to
            stare at, and the rank stays the page's primary fact. */}
        {topCategory && (
          <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]">
            <div className="grid grid-cols-2 divide-x divide-y divide-[var(--border)] sm:grid-cols-4 sm:divide-y-0">
              <StatCell
                label={
                  <>
                    <span>{m.brand.whyMetricRank}</span>
                    <span aria-hidden>·</span>
                    <Link
                      href={
                        topCategory.rankSource === "best_engine" && topCategory.bestEngine
                          ? `/category/${topCategory.slug}?engine=${encodeURIComponent(topCategory.bestEngine)}`
                          : `/category/${topCategory.slug}`
                      }
                      className="normal-case tracking-normal transition-colors hover:text-[var(--text)]"
                    >
                      {topCategoryName}
                    </Link>
                  </>
                }
                value={
                  topCategory.rankSource === "best_engine" && topCategory.bestEngine
                    ? `${engineLabel(topCategory.bestEngine)} #${topCategory.rank}`
                    : `#${topCategory.rank}`
                }
              />
              <StatCell label={m.common.score} value={topCategory.score.toFixed(1)} />
              <StatCell
                label={m.brand.whyMetricMention}
                value={`${(topCategory.mentionFrequency * 100).toFixed(0)}%`}
              />
              <StatCell
                label={m.brand.whyMetricEngines}
                value={
                  engineCoverage
                    ? `${engineCoverage.ranked}/${engineCoverage.total}`
                    : m.common.noData
                }
              />
            </div>

            {topCategory.rankSource === "best_engine" && (
              <p className="border-t border-[var(--border)] px-5 py-2 text-xs text-[var(--text-muted)] sm:px-6">
                {m.brand.rankBestEngineNote}
              </p>
            )}

            {/* A single sentence does not earn a collapsible section header, so the
                "nothing to contrast" case renders as one footer line instead. */}
            {/* One shape for every brand: the same collapsible block, with only the
                columns the data supports. An engine-consensus brand has no strengths
                or weaknesses to contrast, so those columns are absent, not empty. */}
            {whyColumns.length > 0 && (
              <details open className="group border-t border-[var(--border)]">
                <summary className="flex cursor-pointer list-none items-center gap-2.5 px-5 py-3 sm:px-6 [&::-webkit-details-marker]:hidden">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden
                    className="shrink-0 text-[var(--text-muted)] transition-transform duration-200 group-open:rotate-90"
                  >
                    <path
                      d="M4.5 2.5L8 6l-3.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <h2 className="text-sm font-semibold tracking-tight text-[var(--text)]">
                    {m.brand.whyTitle(data.name)}
                  </h2>
                </summary>
                <div
                  className={`grid divide-y divide-[var(--border)] border-t border-[var(--border)] sm:divide-x sm:divide-y-0 ${
                    whyColumns.length >= 3
                      ? "sm:grid-cols-3"
                      : whyColumns.length === 2
                        ? "sm:grid-cols-2"
                        : "sm:grid-cols-1"
                  }`}
                >
                  {whyColumns.map((column) => (
                    <WhyColumn key={column.key} title={column.title} tone={column.tone}>
                      {column.body}
                    </WhyColumn>
                  ))}
                </div>
              </details>
            )}
          </section>
        )}

        {categoryList.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-5 py-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">{m.brand.rankingsEmpty}</p>
            <Link
              href="/rankings"
              className="mt-3 inline-block text-sm font-medium text-[var(--text)] underline decoration-[var(--border)] underline-offset-4 transition-colors hover:decoration-[var(--text-muted)]"
            >
              {m.brand.rankingsEmptyLink}
            </Link>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[var(--text)]">
                {m.brand.rankingsByCategory}
              </h2>
              {categoryList.length > 1 && (
                <label className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span>{m.brand.sortBy}</span>
                  <select
                    value={sortKey}
                    onChange={(event) => setSortKey(event.target.value as SortKey)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-xs font-medium text-[var(--text)]"
                  >
                    <option value="rank">{m.brand.sortRank}</option>
                    <option value="score">{m.brand.sortScore}</option>
                    <option value="mention">{m.brand.sortMention}</option>
                  </select>
                </label>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {sorted.map((cat) => {
                let highlight: "top" | "bottom" | null = null;
                if (categoryList.length > 1) {
                  if (sortKey === "rank" && cat.rank === bestRank) highlight = "top";
                  if (sortKey === "rank" && cat.rank === worstRank) highlight = "bottom";
                  if (sortKey === "score" && cat.score === bestScore) highlight = "top";
                  if (sortKey === "score" && cat.score === worstScore) highlight = "bottom";
                  if (sortKey === "mention") {
                    const bestMention = Math.max(...categoryList.map((c) => c.mentionFrequency));
                    const worstMention = Math.min(...categoryList.map((c) => c.mentionFrequency));
                    if (cat.mentionFrequency === bestMention) highlight = "top";
                    if (cat.mentionFrequency === worstMention) highlight = "bottom";
                  }
                }
                return (
                  <CategoryCard
                    key={cat.slug}
                    category={cat}
                    history={historyByCategory[cat.slug]}
                    collectedEngines={collectedEngines}
                    similar={similarByCategory[cat.slug] ?? []}
                    highlight={highlight}
                    showCompare={categoryList.length > 1}
                    periodWeek={data.week}
                    compare={{
                      rankDelta: cat.rank - bestRank,
                      scoreDelta: bestScore - cat.score,
                      bestRank,
                      bestScore,
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {evidence}

        <LeadForm sourcePath={`/brand/${data.slug}`} />
      </div>
    </>
  );
}
