"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ENGINES } from "@/lib/constants";
import type { CategoryBoardsData } from "@/lib/leaderboard";
import { getRankDelta, type RankDelta } from "@/lib/rank-change";

type TabKey = "overall" | (typeof ENGINES)[number];

function engineLabel(e: string) {
  return e === "chatgpt" ? "ChatGPT" : e === "gemini" ? "Gemini" : "Grok";
}

function DeltaBadge({ delta }: { delta: RankDelta }) {
  if (delta.kind === "new")
    return (
      <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--card-hover)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
        NEW
      </span>
    );
  if (delta.kind === "up")
    return <span className="font-mono text-sm font-medium text-[var(--green)]">↑{delta.spots}</span>;
  if (delta.kind === "down")
    return <span className="font-mono text-sm font-medium text-[var(--red)]">↓{delta.spots}</span>;
  return <span className="font-mono text-sm text-[var(--text-muted)]">—</span>;
}

type Props = {
  slug: string;
  data: CategoryBoardsData;
  initialTab: TabKey;
  availableWeeks: string[];
};

export function CategoryBoard({ slug, data, initialTab, availableWeeks }: Props) {
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

  const view = data.boards[tab];
  const isOverall = tab === "overall";

  function deltaFor(brandId: string, currentRank: number): RankDelta {
    return getRankDelta(currentRank, view.prevRanks, brandId, view.hasPrevWeekData);
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overall", label: "Overall" },
    ...ENGINES.map((e) => ({ key: e, label: engineLabel(e) })),
  ];

  return (
    <>
      <div className="mb-8 flex flex-wrap gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => selectTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-[var(--cta-bg)] text-[var(--cta-text)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view.snapshots.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] py-24 text-center">
          <p className="text-base font-medium text-[var(--text-secondary)]">No data available yet</p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Rankings will appear after the first weekly collection.
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
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    Company
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    Score
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    Appearance
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    Avg Rank
                  </th>
                  {isOverall && (
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                      Coverage
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                    Δ
                  </th>
                </tr>
              </thead>
              <tbody>
                {view.snapshots.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-[var(--border)] bg-[var(--card)] transition-colors last:border-b-0 hover:bg-[var(--card-hover)]"
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
                        href={`/brand/${s.brandSlug}?from=${encodeURIComponent(sourcePath)}`}
                        className="font-medium text-[var(--text)] hover:text-[var(--text-secondary)] transition-colors"
                      >
                        {s.brandName}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-[var(--text-secondary)]">
                      {s.parentCompanyName ?? "—"}
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
    </>
  );
}
