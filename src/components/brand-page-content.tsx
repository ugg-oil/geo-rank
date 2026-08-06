"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BrandTrendCharts } from "@/components/brand-trend-charts";
import type { BrandHistoryPoint } from "@/lib/brand-history-data";
import type { BrandPageData } from "@/lib/brand-page";
import { computeTrendLabel, type TrendLabel } from "@/lib/brand-trend-label";
import { engineLabel } from "@/lib/constants";
import { formatWeekLabel, getCategoryMessages } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { SimilarBrandCandidate } from "@/lib/similar-brands";
import { toBrandSlug } from "@/lib/brand-slug";
import { LeadForm } from "@/components/lead-form";

type SortKey = "score" | "rank" | "mention";

function EngineBadge({
  engine,
  rank,
  score,
}: {
  engine: string;
  rank?: number;
  score?: number;
}) {
  const { m } = useI18n();
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2">
      <span className="text-xs font-medium text-[var(--text-secondary)]">{engineLabel(engine)}</span>
      <span className="font-mono text-xs text-[var(--text-muted)]">
        {rank != null && score != null ? `#${rank} · ${score.toFixed(1)}` : m.common.noData}
      </span>
    </div>
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
    <span
      className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${color}`}
    >
      {text}
    </span>
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
}: {
  category: BrandPageData["categories"][number];
  history?: BrandHistoryPoint[];
  collectedEngines: readonly string[];
  similar: SimilarBrandCandidate[];
  highlight: "top" | "bottom" | null;
  compare: { rankDelta: number; scoreDelta: number; bestRank: number; bestScore: number };
  showCompare: boolean;
}) {
  const { m } = useI18n();
  const categoryName = getCategoryMessages(m, category.slug)?.name ?? category.slug;
  const engineEntries = collectedEngines.map((engine) => ({
    engine,
    ...category.engines[engine],
  }));
  const trend = history ? computeTrendLabel(history) : null;
  const ring =
    highlight === "top"
      ? "ring-1 ring-[var(--green)]/40"
      : highlight === "bottom"
        ? "ring-1 ring-[var(--red)]/30"
        : "";

  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 ${ring}`}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/category/${category.slug}`}
            className="text-base font-semibold text-[var(--text)] hover:text-[var(--text-secondary)] transition-colors"
          >
            {categoryName}
          </Link>
          {trend && <TrendBadge label={trend} />}
        </div>
        <span className="font-mono text-lg font-semibold text-[var(--text)]">#{category.rank}</span>
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
            />
          ))}
        </div>
      )}

      {history && <BrandTrendCharts points={history} />}

      <div className="mt-4 border-t border-[var(--border)] pt-4">
        <p className="mb-2 text-xs text-[var(--text-muted)]">{m.brand.similarBrands}</p>
        {similar.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">{m.brand.similarEmpty}</p>
        ) : (
          <ul className="space-y-1.5">
            {similar.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/brand/${item.slug}`}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm transition-colors hover:bg-[var(--card-hover)]"
                >
                  <span className="font-medium text-[var(--text)]">{item.name}</span>
                  <span className="font-mono text-xs text-[var(--text-muted)]">
                    #{item.rank} · {item.score.toFixed(1)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
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
};

export function BrandPageContent({
  data,
  historyByCategory,
  similarByCategory,
  backHref,
  backCategorySlug,
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
    return rows;
  }, [categoryList, sortKey]);

  const bestRank = Math.min(...categoryList.map((c) => c.rank));
  const bestScore = Math.max(...categoryList.map((c) => c.score));
  const worstRank = Math.max(...categoryList.map((c) => c.rank));
  const worstScore = Math.min(...categoryList.map((c) => c.score));

  const topCategory = categoryList.reduce(
    (best, c) => (c.rank < best.rank ? c : best),
    categoryList[0]!
  );
  const topCategoryName =
    getCategoryMessages(m, topCategory.slug)?.name ?? topCategory.slug;
  const parentPart = data.parentCompany ? m.brand.productOf(data.parentCompany) : "";
  const collectedEngines = data.collectedEngines ?? [];
  const weekLabel = formatWeekLabel(m, data.week);
  const otherCategories =
    categoryList.length > 1
      ? categoryList.length === 2
        ? m.brand.otherCategoriesOne
        : m.brand.otherCategoriesMany(categoryList.length - 1)
      : "";
  const engineDiffs =
    Object.keys(topCategory.engines).length > 0
      ? m.brand.engineDiffs(
          Object.entries(topCategory.engines)
            .map(([engine, entry]) => m.brand.engineRanks(engineLabel(engine), entry.rank))
            .join(", ")
        )
      : "";
  const categorySummary =
    categoryList.length > 1
      ? m.brand.whyCategories(
          categoryList
            .map((c) =>
              m.brand.whyCategoryPart(
                getCategoryMessages(m, c.slug)?.name ?? c.slug,
                c.rank,
                c.score.toFixed(1)
              )
            )
            .join("; ")
        )
      : "";
  const topTrend = computeTrendLabel(historyByCategory[topCategory.slug] ?? []);
  const trendSentence = topTrend
    ? m.brand.whyTrend(
        topTrend === "Rising"
          ? m.brand.trendRising
          : topTrend === "Declining"
            ? m.brand.trendDeclining
            : m.brand.trendStable,
        topCategoryName
      )
    : "";

  const backLabel = backCategorySlug
    ? getCategoryMessages(m, backCategorySlug)?.name ?? m.common.categoryRankings
    : m.common.allRankings;

  return (
    <>
      <Link
        href={backHref}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {backLabel}
      </Link>

      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{data.name}</h1>
          {data.parentCompany && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              <Link
                href={`/company/${toBrandSlug(data.parentCompany)}`}
                className="hover:text-[var(--text)] transition-colors"
              >
                {data.parentCompany}
              </Link>
            </p>
          )}
          <p className="mt-1.5 font-mono text-xs text-[var(--text-muted)]">
            {m.brand.lastUpdated(weekLabel)}
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 sm:p-6">
          <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {m.brand.whyTitle(data.name)}
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            {m.brand.whyBody({
              name: data.name,
              parentPart,
              rank: topCategory.rank,
              category: topCategoryName,
              score: topCategory.score.toFixed(1),
              mention: (topCategory.mentionFrequency * 100).toFixed(0),
              otherCategories,
              engineDescs: `${engineDiffs}${categorySummary}${trendSentence}`,
            })}
          </p>
          <p className="mt-2 text-xs text-[var(--text-muted)]">{m.brand.basedOn(weekLabel)}</p>
        </div>

        {categoryList.length > 0 && (
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

        <LeadForm sourcePath={`/brand/${data.slug}`} />
      </div>
    </>
  );
}
