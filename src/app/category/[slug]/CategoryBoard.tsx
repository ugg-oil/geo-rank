"use client";

import { useCallback, useState, type ReactNode } from "react";
import Link from "next/link";
import { toBrandSlug } from "@/lib/brand-slug";
import { engineLabel, formatEngineList } from "@/lib/constants";
import { useI18n } from "@/lib/i18n/use-i18n";
import { getCategoryMessages } from "@/lib/i18n/messages";
import { inferCollectedEngines, type CategoryBoardsData } from "@/lib/leaderboard-data";
import type { PeriodHighlight } from "@/lib/period-highlight";
import { getRankDelta, type RankDelta } from "@/lib/rank-change";
import { CompetitionQuadrantChart } from "./CompetitionQuadrantChart";

type TabKey = string;

function DeltaBadge({ delta }: { delta: RankDelta }) {
  const { m } = useI18n();
  if (delta.kind === "new")
    return (
      <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--card-hover)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
        {m.common.new}
      </span>
    );
  if (delta.kind === "up")
    return <span className="font-mono text-sm font-medium text-[var(--green)]">↑{delta.spots}</span>;
  if (delta.kind === "down")
    return <span className="font-mono text-sm font-medium text-[var(--red)]">↓{delta.spots}</span>;
  return <span className="font-mono text-sm text-[var(--text-muted)]">—</span>;
}

function PeriodHighlightLine({
  highlight,
  categoryName,
  brandHref,
}: {
  highlight: PeriodHighlight;
  categoryName: string;
  brandHref: string | null;
}) {
  const { m } = useI18n();
  const brand = brandHref ? (
    <Link
      href={brandHref}
      className="font-medium text-[var(--text)] underline decoration-[var(--border)] underline-offset-[3px] transition-colors hover:decoration-[var(--text-muted)]"
    >
      {highlight.brandName}
    </Link>
  ) : (
    <span className="font-medium text-[var(--text)]">{highlight.brandName}</span>
  );

  const suffix =
    highlight.kind === "took_first"
      ? m.category.periodHighlightTookFirst(categoryName)
      : highlight.kind === "largest_climb"
        ? m.category.periodHighlightLargestClimb(highlight.spots ?? 0, highlight.rank ?? 0)
        : m.category.periodHighlightDebut(highlight.rank ?? 0);

  return (
    <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
      {brand}
      {suffix}
    </p>
  );
}

type Props = {
  slug: string;
  data: CategoryBoardsData;
  initialTab: TabKey;
  availableWeeks: string[];
  alsoMentionedSlot?: ReactNode;
};

export function CategoryBoard({
  slug,
  data,
  initialTab,
  availableWeeks,
  alsoMentionedSlot,
}: Props) {
  const { m } = useI18n();
  const categoryName = getCategoryMessages(m, slug)?.name ?? slug;
  const collectedEngines = inferCollectedEngines(data);
  const [tab, setTab] = useState<TabKey>(initialTab);

  const sourceParams = new URLSearchParams();
  if (data.week !== availableWeeks[0]) {
    sourceParams.set("week", data.week.replace("Week of ", ""));
  }
  if (tab !== "overall") sourceParams.set("engine", tab);
  const sourcePath = `/category/${slug}${sourceParams.size ? `?${sourceParams}` : ""}`;

  const selectTab = useCallback(
    (next: TabKey) => {
      setTab(next);
      const params = new URLSearchParams();
      if (data.week !== availableWeeks[0]) params.set("week", data.week.replace("Week of ", ""));
      if (next !== "overall") params.set("engine", next);
      const url = `/category/${slug}${params.size ? `?${params}` : ""}`;
      window.history.replaceState(null, "", url);
    },
    [availableWeeks, data.week, slug]
  );

  const view = data.boards[tab] ?? { snapshots: [], prevRanks: {}, hasPrevWeekData: false };
  const isOverall = tab === "overall";
  const hasAnyBoardData = Object.values(data.boards).some((board) => board.snapshots.length > 0);
  const periodHighlight = data.periodHighlight;

  function deltaFor(brandId: string, currentRank: number): RankDelta {
    return getRankDelta(currentRank, view.prevRanks, brandId, view.hasPrevWeekData);
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overall", label: m.common.overall },
    ...collectedEngines.map((engine) => ({ key: engine, label: engineLabel(engine) })),
  ];

  return (
    <div>
      {periodHighlight && (
        <div className="mb-4 border-b border-[var(--border)] pb-3">
          <PeriodHighlightLine
            highlight={periodHighlight}
            categoryName={categoryName}
            brandHref={
              periodHighlight.hasBrandPage
                ? `/brand/${periodHighlight.brandSlug}?from=${encodeURIComponent(sourcePath)}`
                : null
            }
          />
        </div>
      )}

      <div
        className={`flex flex-wrap gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 ${
          data.coverageExpansion && data.coverageExpansion.length > 0 ? "mb-1.5" : "mb-4"
        }`}
      >
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            type="button"
            onClick={() => selectTab(tabItem.key)}
            className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === tabItem.key
                ? "bg-[var(--cta-bg)] text-[var(--cta-text)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {data.coverageExpansion && data.coverageExpansion.length > 0 && (
        <p className="mb-3 text-xs leading-relaxed text-[var(--text-muted)]">
          {m.category.coverageExpansion(formatEngineList(data.coverageExpansion))}
        </p>
      )}

      {view.snapshots.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] py-24 text-center">
          <p className="text-base font-medium text-[var(--text-secondary)]">{m.common.noData}</p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {!hasAnyBoardData
              ? m.category.emptyNone
              : isOverall
                ? m.category.emptyOverall
                : m.category.emptyEngine}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    {m.common.product}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    {m.common.company}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    {m.common.score}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    {m.common.appearance}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    {m.common.avgRank}
                  </th>
                  {isOverall && (
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                      {m.common.coverage}
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    {m.common.delta}
                  </th>
                </tr>
              </thead>
              <tbody>
                {view.snapshots.map((s) => (
                  <tr
                    key={s.brandId || s.id}
                    className="group border-b border-[var(--border)] bg-[var(--card)] transition-colors last:border-b-0 hover:bg-[var(--card-hover)]"
                  >
                    <td
                      className={`px-4 py-3.5 font-mono ${
                        s.rank <= 3
                          ? "font-semibold text-[var(--text)]"
                          : "text-[var(--text-muted)]"
                      }`}
                    >
                      {s.rank}
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        prefetch={false}
                        href={`/brand/${s.brandSlug}?from=${encodeURIComponent(sourcePath)}`}
                        className="font-medium text-[var(--text)] underline decoration-[var(--border)] underline-offset-[3px] transition-colors hover:decoration-[var(--text-muted)] group-hover:decoration-[var(--border-hover)]"
                      >
                        {s.brandName}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      {s.parentCompanyName ? (
                        <Link
                          prefetch={false}
                          href={`/company/${toBrandSlug(s.parentCompanyName)}`}
                          className="text-[var(--text-secondary)] underline decoration-transparent underline-offset-[3px] transition-colors hover:text-[var(--text)] hover:decoration-[var(--text-muted)] group-hover:text-[var(--text)] group-hover:decoration-[var(--border-hover)]"
                        >
                          {s.parentCompanyName}
                        </Link>
                      ) : (
                        <span className="text-[var(--text-secondary)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-medium">{s.score.toFixed(1)}</td>
                    <td className="px-4 py-3.5 text-right font-mono text-[var(--text-secondary)]">
                      {(s.appearanceRate * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-[var(--text-secondary)]">
                      {s.avgRank.toFixed(1)}
                    </td>
                    {isOverall && (
                      <td className="px-4 py-3.5 text-right font-mono text-[var(--text-secondary)]">
                        {s.modelCoverage !== null
                          ? `${(s.modelCoverage * 100).toFixed(0)}%`
                          : "—"}
                      </td>
                    )}
                    <td className="px-4 py-3.5 text-right">
                      <DeltaBadge delta={deltaFor(s.brandId, s.rank)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* P4: always Overall Top 20; visible on every engine tab */}
      <CompetitionQuadrantChart
        snapshots={data.boards.overall?.snapshots ?? []}
        sourcePath={sourcePath}
      />

      {isOverall ? alsoMentionedSlot : null}
    </div>
  );
}
