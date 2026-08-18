"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { toBrandSlug } from "@/lib/brand-slug";
import { engineLabel } from "@/lib/constants";
import { useI18n } from "@/lib/i18n/use-i18n";
import { getCategoryMessages } from "@/lib/i18n/messages";
import { inferCollectedEngines, type CategoryBoardsData } from "@/lib/leaderboard-data";
import type { PeriodHighlight } from "@/lib/period-highlight";
import {
  canCompare as canCompareCount,
  COMPARE_MAX,
  DEFAULT_SORT_KEY,
  isAscendingSort,
  isDefaultSort,
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
  "px-4 py-3 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]";

/**
 * Top 3 are marked by a left rail and a boxed rank only. Tinted row backgrounds
 * read as a block of colour across a 9-column table and fought the up/down
 * green in the Change column.
 */
function podiumRail(rank: number): string {
  if (rank === 1) return "shadow-[inset_3px_0_0_var(--yellow)]";
  if (rank <= 3) return "shadow-[inset_3px_0_0_var(--yellow-soft)]";
  return "";
}

/**
 * Standalone `?` with a hover/tap tooltip, for header cells that explain but
 * don't sort (the position column).
 */
function PlainTip({ tip }: { tip: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const tipId = useId();

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

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label={tip}
        aria-describedby={open ? tipId : undefined}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border text-[9px] font-semibold leading-none transition-colors ${
          open
            ? "border-[var(--text-muted)] text-[var(--text)]"
            : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-secondary)]"
        }`}
      >
        ?
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className="absolute left-0 top-full z-20 mt-1.5 w-56 whitespace-normal rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-left text-[11px] font-normal normal-case leading-relaxed tracking-normal text-[var(--text-secondary)] shadow-lg"
        >
          {tip}
        </span>
      )}
    </span>
  );
}

/**
 * Tip lives on a small `?` to the left of the label so hovering the sort
 * control doesn't pop the explanation. Sort and explain are separate targets.
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
    ? active
      ? `${m.category.sortBy(label)} · ${
          ascending ? m.category.sortedAsc : m.category.sortedDesc
        } · ${m.category.sortToggle}`
      : m.category.sortBy(label)
    : undefined;

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
      <span className="inline-flex items-center justify-end gap-1.5">
        <button
          type="button"
          data-tip
          aria-label={tip}
          aria-describedby={open ? tipId : undefined}
          onClick={() => setOpen((v) => !v)}
          // Mouse (not pointer) events: touch fires pointerleave right after the
          // tap, which would close the tooltip before it is ever seen.
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border text-[9px] font-semibold leading-none transition-colors ${
            open
              ? "border-[var(--text-muted)] text-[var(--text)]"
              : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-secondary)]"
          }`}
        >
          ?
        </button>
        {sortKey ? (
          <button
            type="button"
            aria-label={sortLabel}
            onClick={() => onSort(sortKey)}
            className={`group -mx-1 inline-flex items-baseline gap-1 rounded px-1 uppercase transition-colors hover:bg-[var(--card-hover)] ${
              active ? "text-[var(--text)]" : "hover:text-[var(--text-secondary)]"
            }`}
          >
            <span>{label}</span>
            {/* Always visible: an arrow that only appears on hover gives a mouse
                user no reason to try clicking, and none at all on touch. The
                double arrow says "sortable", a single one says "sorted, and this
                is the direction". */}
            <span
              aria-hidden
              className={`font-mono text-[10px] leading-none transition-opacity ${
                active
                  ? "font-semibold opacity-100"
                  : "opacity-40 group-hover:opacity-90"
              }`}
            >
              {active ? (ascending ? "↑" : "↓") : "↕"}
            </span>
          </button>
        ) : (
          <span>{label}</span>
        )}
      </span>
      {active && (
        <span
          aria-hidden
          className="absolute inset-x-0 -bottom-px h-[2px] bg-[var(--text)]"
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
    return (
      <span className="num inline-flex items-baseline gap-0.5 font-mono text-sm font-semibold text-[var(--green)]">
        <span aria-hidden>↑</span>
        {delta.spots}
      </span>
    );
  if (delta.kind === "down")
    return (
      <span className="num inline-flex items-baseline gap-0.5 font-mono text-sm font-semibold text-[var(--red)]">
        <span aria-hidden>↓</span>
        {delta.spots}
      </span>
    );
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
      <span
        aria-hidden
        className="mr-2 inline-block h-1.5 w-1.5 -translate-y-[2px] rounded-full bg-[var(--yellow)]"
      />
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
  function resetSort() {
    setSortKey(DEFAULT_SORT_KEY);
    setFlipped(new Set());
  }
  const sortedByDefault = isDefaultSort({ sortKey: activeSortKey, flipped });
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
        <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
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

      <div className="surface mb-4 flex flex-wrap gap-1 p-1.5">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            type="button"
            onClick={() => selectTab(tabItem.key)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              tab === tabItem.key
                ? "bg-[var(--cta-bg)] text-[var(--cta-text)]"
                : "text-[var(--text-muted)] hover:bg-[var(--card-hover)] hover:text-[var(--text)]"
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {view.snapshots.length === 0 ? (
        <div className="surface py-24 text-center">
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
        <div className="surface overflow-hidden">
          {/* P2-2: the checkbox column alone never told anyone this existed, so
              the entry point is stated before any row is ticked. It shares the
              panel header with the board title instead of looking bolted on. */}
          <div className="surface-head flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="panel-title text-sm font-semibold text-[var(--text)]">
                {m.category.boardTitle}
              </h2>
              {/* Once another column drives the order, the # column stops matching
                  row order — say so, and offer the way back. */}
              {!sortedByDefault && (
                <button
                  type="button"
                  onClick={resetSort}
                  title={m.category.sortResetHint}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text)]"
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path
                      d="M2.5 6a3.5 3.5 0 1 1 1.03 2.47"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                    <path
                      d="M2.5 3.2v2.9h2.9"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {m.category.sortReset}
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
                <CheckboxGlyph />
                {m.category.compareLead}
              </span>
              {selectedIds.length > 0 ? (
                <span className="num rounded-full border border-[var(--border-hover)] bg-[var(--card)] px-2 py-0.5 font-mono font-medium text-[var(--text)]">
                  {m.category.compareSelected(selectedIds.length, COMPARE_MAX)}
                </span>
              ) : (
                <span className="text-[var(--text-muted)]">
                  {m.category.compareHint(COMPARE_MAX)}
                </span>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--card)]">
                  <th scope="col" className="w-9 py-2.5 pl-4 pr-0">
                    <span className="sr-only">{m.category.compareOpen}</span>
                  </th>
                  <th scope="col" className={`text-left ${HEAD_CELL}`}>
                    <span className="inline-flex items-center gap-1.5">
                      <PlainTip tip={m.category.posHeaderTip} />
                      {m.category.posHeader}
                    </span>
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
                {rows.map((s, i) => {
                  const selected = selectedIds.includes(s.brandId);
                  const position = i + 1;
                  return (
                    <tr
                      key={s.brandId || s.id}
                      className={`group border-b border-[var(--border)] transition-colors last:border-b-0 hover:bg-[var(--card-hover)] ${
                        selected ? "bg-[var(--card-hover)]" : "bg-[var(--card)]"
                      } ${podiumRail(s.rank)}`}
                    >
                      <td className="w-9 py-0 pl-4 pr-0">
                        {/* Label wrapper: a 16px box is a poor tap target on its own. */}
                        <label className="flex cursor-pointer items-center py-4 pr-2">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelected(s.brandId)}
                            disabled={!selected && selectedIds.length >= COMPARE_MAX}
                            aria-label={m.category.compareSelect(s.brandName)}
                            className="h-4 w-4 cursor-pointer accent-[var(--cta-bg)] disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </label>
                      </td>
                      <td className="py-4 pl-4 pr-2">
                        {position <= 3 ? (
                          <span className="num inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] font-mono text-sm font-semibold text-[var(--text)]">
                            {position}
                          </span>
                        ) : (
                          <span className="num inline-flex h-7 w-7 items-center justify-center font-mono text-sm text-[var(--text-muted)]">
                            {position}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="flex items-center gap-2">
                          <Link
                            prefetch={false}
                            href={`/brand/${s.brandSlug}?from=${encodeURIComponent(sourcePath)}`}
                            className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--text)] underline decoration-transparent decoration-2 underline-offset-[4px] transition-colors hover:decoration-[var(--text-muted)] group-hover:decoration-[var(--border-hover)]"
                          >
                            {s.brandName}
                          </Link>
                          {/* Overall rank is the row's stable identity. Shown only
                              when the sort reorders rows, so the default view
                              (position == rank) isn't cluttered with #7 next to 7. */}
                          {!sortedByDefault && (
                            <span
                              className="num shrink-0 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[10px] font-medium text-[var(--text-muted)]"
                              title={
                                isOverall
                                  ? m.category.overallRankBadge(s.rank)
                                  : m.category.boardRankBadge(s.rank)
                              }
                            >
                              #{s.rank}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {s.parentCompanyName ? (
                          <Link
                            prefetch={false}
                            href={`/company/${toBrandSlug(s.parentCompanyName)}?from=${encodeURIComponent(sourcePath)}`}
                            className="text-[13px] text-[var(--text-muted)] underline decoration-transparent underline-offset-[3px] transition-colors hover:text-[var(--text)] hover:decoration-[var(--text-muted)]"
                          >
                            {s.parentCompanyName}
                          </Link>
                        ) : (
                          <span className="text-[13px] text-[var(--text-muted)]">—</span>
                        )}
                      </td>
                      <td className="num px-4 py-4 text-right font-mono text-[15px] font-semibold text-[var(--text)]">
                        {s.score.toFixed(1)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {/* A rail beside the number turns this column into a shape
                            you can scan without reading all 20 values. */}
                        <span className="inline-flex items-center justify-end gap-2.5">
                          <span
                            aria-hidden
                            className="hidden h-[3px] w-14 overflow-hidden rounded-full bg-[var(--border)] sm:block"
                          >
                            <span
                              className="block h-full rounded-full bg-[var(--yellow-soft)] transition-colors group-hover:bg-[var(--yellow)]"
                              style={{
                                width: `${Math.min(100, Math.max(3, s.appearanceRate * 100))}%`,
                              }}
                            />
                          </span>
                          <span className="num font-mono text-[var(--text-secondary)]">
                            {(s.appearanceRate * 100).toFixed(0)}%
                          </span>
                        </span>
                      </td>
                      <td className="num px-4 py-4 text-right font-mono text-[var(--text-secondary)]">
                        {s.avgRank.toFixed(1)}
                      </td>
                      {isOverall && (
                        <td className="num px-4 py-4 text-right font-mono text-[var(--text-secondary)]">
                          {s.modelCoverage !== null
                            ? `${(s.modelCoverage * 100).toFixed(0)}%`
                            : "—"}
                        </td>
                      )}
                      <td className="px-4 py-4 text-right">
                        <DeltaBadge delta={deltaFor(s.brandId, s.rank)} />
                      </td>
                    </tr>
                  );
                })}
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
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-[var(--border-hover)] bg-[var(--card)] px-4 py-2 shadow-[var(--shadow-raised)]">
            <span className="num font-mono text-xs text-[var(--text-secondary)]">
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
