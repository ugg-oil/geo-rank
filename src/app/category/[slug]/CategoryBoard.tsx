"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { toBrandSlug } from "@/lib/brand-slug";
import { engineLabel, formatEngineList } from "@/lib/constants";
import { useI18n } from "@/lib/i18n/use-i18n";
import { getCategoryMessages } from "@/lib/i18n/messages";
import { inferCollectedEngines, type CategoryBoardsData } from "@/lib/leaderboard-data";
import type { PeriodHighlight } from "@/lib/period-highlight";
import {
  canCompare as canCompareCount,
  COMPARE_MAX,
  DEFAULT_SORT_KEY,
  isAscendingSort,
  nextSortState,
  resolveSortKey,
  sortLeaderboardRows,
  toggleCompareSelection,
  type SortKey,
} from "@/lib/category-board-view";
import { normalizePeriodDate } from "@/lib/period";
import { getRankDelta, type RankDelta } from "@/lib/rank-change";
import { CompareDialog } from "./CompareDialog";
import { CompetitionQuadrantChart } from "./CompetitionQuadrantChart";

type TabKey = string;

/** Ties the compare toolbar to the checkbox column it is talking about. */
function CheckboxGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      fill="none"
      className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]"
    >
      <rect
        x={1.5}
        y={1.5}
        width={13}
        height={13}
        rx={3}
        stroke="currentColor"
        strokeWidth={1.5}
      />
      <path
        d="M4.6 8.2 7 10.6l4.4-5"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Shared look for every header cell, so plain and interactive ones line up. */
const HEAD_CELL =
  "px-4 py-2.5 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]";

/**
 * One button per metric column doing both jobs: click sorts, hover/focus/tap
 * explains. Five separate `?` circles in a row was the noisiest thing on screen.
 */
function MetricHeader({
  label,
  tip,
  sortKey,
  activeKey,
  ascending,
  onSort,
}: {
  label: string;
  tip: string;
  /** Omit for columns that explain but don't sort (Change). */
  sortKey?: SortKey;
  activeKey: SortKey;
  ascending: boolean;
  onSort: (key: SortKey) => void;
}) {
  const { m } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLTableCellElement>(null);
  const tipId = useId();
  const active = sortKey !== undefined && activeKey === sortKey;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const sortLabel = sortKey
    ? `${m.category.sortBy(label)} · ${
        active ? (ascending ? m.category.sortedAsc : m.category.sortedDesc) : ""
      } · ${tip}`
    : tip;

  return (
    <th
      ref={ref}
      scope="col"
      aria-sort={
        sortKey === undefined
          ? undefined
          : active
            ? ascending
              ? "ascending"
              : "descending"
            : "none"
      }
      className={`relative text-right ${HEAD_CELL}`}
    >
      <button
        type="button"
        data-tip
        aria-label={sortLabel}
        aria-describedby={open ? tipId : undefined}
        onClick={() => {
          if (sortKey) onSort(sortKey);
          setOpen(true);
        }}
        // Mouse (not pointer) events: touch fires pointerleave right after the
        // tap, which would close the tooltip before it is ever seen.
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        className={`group inline-flex items-baseline gap-1.5 uppercase transition-colors ${
          active ? "text-[var(--text)]" : "hover:text-[var(--text-secondary)]"
        }`}
      >
        {/* The dotted rule only shows on hover: at rest it is invisible against
            the elevated header, so it was pure noise. */}
        <span className="underline decoration-transparent decoration-dotted underline-offset-[5px] transition-colors group-hover:decoration-[var(--text-muted)]">
          {label}
        </span>
        {sortKey && (
          <span
            aria-hidden
            className={`font-mono text-[10px] leading-none transition-opacity ${
              active ? "opacity-100" : "opacity-0 group-hover:opacity-70"
            }`}
          >
            {active && ascending ? "↑" : "↓"}
          </span>
        )}
      </button>
      {active && (
        <span
          aria-hidden
          className="absolute inset-x-0 -bottom-px h-[2px] bg-[var(--yellow)]"
        />
      )}
      {/* whitespace-normal / normal-case: the header cell is uppercase + nowrap
          and would otherwise stretch the tip into one shouting line. */}
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className="absolute right-2 top-full z-20 mt-1.5 w-56 whitespace-normal rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-left text-[11px] font-normal normal-case leading-relaxed tracking-normal text-[var(--text-secondary)] shadow-lg"
        >
          {tip}
        </span>
      )}
    </th>
  );
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
  const [sortKey, setSortKey] = useState<SortKey>(DEFAULT_SORT_KEY);
  const [flipped, setFlipped] = useState<Set<SortKey>>(new Set());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const sourceParams = new URLSearchParams();
  if (data.week !== availableWeeks[0]) {
    sourceParams.set("week", data.week.replace("Week of ", ""));
  }
  if (tab !== "overall") sourceParams.set("engine", tab);
  const sourcePath = `/category/${slug}${sourceParams.size ? `?${sourceParams}` : ""}`;

  function selectTab(next: TabKey) {
    setTab(next);
    // Selection is per board — engine boards hold different products.
    setSelectedIds([]);
    setCompareOpen(false);
    const params = new URLSearchParams();
    if (data.week !== availableWeeks[0]) params.set("week", data.week.replace("Week of ", ""));
    if (next !== "overall") params.set("engine", next);
    const url = `/category/${slug}${params.size ? `?${params}` : ""}`;
    window.history.replaceState(null, "", url);
  }

  const view = data.boards[tab] ?? { snapshots: [], prevRanks: {}, hasPrevWeekData: false };
  const isOverall = tab === "overall";
  const activeSortKey = resolveSortKey(sortKey, isOverall);
  const ascending = isAscendingSort(activeSortKey, flipped);
  const rows = sortLeaderboardRows(view.snapshots, activeSortKey, ascending);

  function onSort(clicked: SortKey) {
    const next = nextSortState({ sortKey, flipped }, clicked);
    setSortKey(next.sortKey);
    setFlipped(next.flipped);
  }
  const hasAnyBoardData = Object.values(data.boards).some((board) => board.snapshots.length > 0);
  const periodHighlight = data.periodHighlight;

  // Keep compare order = board order, not click order.
  const selectedRows = rows.filter((row) => selectedIds.includes(row.brandId));
  const canCompare = canCompareCount(selectedRows.length);

  function toggleSelected(brandId: string) {
    setSelectedIds((prev) => toggleCompareSelection(prev, brandId));
  }

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
          {/* P2-2: the checkbox column alone never told anyone this existed, so
              the entry point is stated before any row is ticked. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-xs">
            <CheckboxGlyph />
            <span className="font-medium text-[var(--text-secondary)]">
              {m.category.compareLead}
            </span>
            {selectedIds.length > 0 ? (
              <span className="font-mono text-[var(--text)]">
                {m.category.compareSelected(selectedIds.length, COMPARE_MAX)}
              </span>
            ) : (
              <span className="text-[var(--text-muted)]">
                {m.category.compareHint(COMPARE_MAX)}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-elevated)]">
                  <th scope="col" className="w-9 py-2.5 pl-4 pr-0">
                    <span className="sr-only">{m.category.compareOpen}</span>
                  </th>
                  <th scope="col" className={`text-left ${HEAD_CELL}`}>
                    #
                  </th>
                  <th scope="col" className={`text-left ${HEAD_CELL}`}>
                    {m.common.product}
                  </th>
                  <th scope="col" className={`text-left ${HEAD_CELL}`}>
                    {m.common.company}
                  </th>
                  <MetricHeader
                    label={m.common.score}
                    tip={m.category.tipScore}
                    sortKey="score"
                    activeKey={activeSortKey}
                    ascending={ascending}
                    onSort={onSort}
                  />
                  <MetricHeader
                    label={m.common.appearance}
                    tip={m.category.tipAppearance}
                    sortKey="appearanceRate"
                    activeKey={activeSortKey}
                    ascending={ascending}
                    onSort={onSort}
                  />
                  <MetricHeader
                    label={m.common.avgRank}
                    tip={m.category.tipAvgRank}
                    sortKey="avgRank"
                    activeKey={activeSortKey}
                    ascending={ascending}
                    onSort={onSort}
                  />
                  {isOverall && (
                    <MetricHeader
                      label={m.common.coverage}
                      tip={m.category.tipCoverage}
                      sortKey="modelCoverage"
                      activeKey={activeSortKey}
                      ascending={ascending}
                      onSort={onSort}
                    />
                  )}
                  <MetricHeader
                    label={m.common.delta}
                    tip={m.category.tipDelta}
                    activeKey={activeSortKey}
                    ascending={ascending}
                    onSort={onSort}
                  />
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr
                    key={s.brandId || s.id}
                    className={`group border-b border-[var(--border)] transition-colors last:border-b-0 hover:bg-[var(--card-hover)] ${
                      selectedIds.includes(s.brandId)
                        ? "bg-[var(--card-hover)]"
                        : "bg-[var(--card)]"
                    }`}
                  >
                    <td className="w-9 py-0 pl-4 pr-0">
                      {/* Label wrapper: a 16px box is a poor tap target on its own. */}
                      <label className="flex cursor-pointer items-center py-3.5 pr-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(s.brandId)}
                          onChange={() => toggleSelected(s.brandId)}
                          disabled={
                            !selectedIds.includes(s.brandId) &&
                            selectedIds.length >= COMPARE_MAX
                          }
                          aria-label={m.category.compareSelect(s.brandName)}
                          className="h-4 w-4 cursor-pointer accent-[var(--yellow)] disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </label>
                    </td>
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
        prevMetrics={
          data.boards.overall?.hasPrevWeekData
            ? data.boards.overall.prevMetrics
            : undefined
        }
      />

      {isOverall ? alsoMentionedSlot : null}

      {/* P2-2: selection tray. Sticky so it survives scrolling a long board. */}
      {selectedIds.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-[var(--border-hover)] bg-[var(--card)] px-4 py-2 shadow-xl">
            <span className="font-mono text-xs text-[var(--text-secondary)]">
              {m.category.compareSelected(selectedIds.length, COMPARE_MAX)}
            </span>
            {!canCompare && (
              <span className="hidden text-xs text-[var(--text-muted)] sm:inline">
                {m.category.compareHint(COMPARE_MAX)}
              </span>
            )}
            <button
              type="button"
              onClick={() => setCompareOpen(true)}
              disabled={!canCompare}
              className="rounded-full bg-[var(--cta-bg)] px-3.5 py-1.5 text-xs font-semibold text-[var(--cta-text)] transition-colors hover:bg-[var(--cta-hover)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {m.category.compareOpen}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
            >
              {m.category.compareClear}
            </button>
          </div>
        </div>
      )}

      {compareOpen && canCompare && (
        <CompareDialog
          rows={selectedRows}
          boardLabel={isOverall ? m.common.overall : engineLabel(tab)}
          periodStart={normalizePeriodDate(data.week)}
          sourcePath={sourcePath}
          showCoverage={isOverall}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </div>
  );
}
