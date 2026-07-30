"use client";

import { useCallback, useState } from "react";
import { ENGINES } from "@/lib/constants";
import type { CategoryBoardsData } from "@/lib/leaderboard";

type TabKey = "overall" | (typeof ENGINES)[number];

function engineLabel(e: string) {
  return e === "chatgpt" ? "ChatGPT" : e === "gemini" ? "Gemini" : "Grok";
}

function DeltaBadge({ delta }: { delta: string | number | null }) {
  if (delta === "New")
    return (
      <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--card-hover)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
        New
      </span>
    );
  if (delta === "Not ranked last week")
    return (
      <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 text-xs font-medium text-[var(--text-muted)]">
        Not ranked last week
      </span>
    );
  if (typeof delta === "number") {
    if (delta > 0)
      return <span className="font-mono text-sm font-medium text-[var(--green)]">↑{delta}</span>;
    if (delta < 0)
      return <span className="font-mono text-sm font-medium text-[var(--red)]">↓{Math.abs(delta)}</span>;
    return <span className="font-mono text-sm text-[var(--text-muted)]">—</span>;
  }
  return <span className="font-mono text-sm text-[var(--text-muted)]">—</span>;
}

type Props = {
  slug: string;
  data: CategoryBoardsData;
  initialTab: TabKey;
};

export function CategoryBoard({ slug, data, initialTab }: Props) {
  const [tab, setTab] = useState<TabKey>(initialTab);

  const selectTab = useCallback(
    (next: TabKey) => {
      setTab(next);
      const url =
        next === "overall"
          ? `/category/${slug}`
          : `/category/${slug}?engine=${next}`;
      window.history.replaceState(null, "", url);
    },
    [slug]
  );

  const view = data.boards[tab];
  const isOverall = tab === "overall";

  function getDelta(brandId: string, currentRank: number): string | number | null {
    if (!view.hasPrevWeekData) return "New";
    const prevRank = view.prevRanks[brandId];
    if (prevRank === undefined) return "Not ranked last week";
    return prevRank - currentRank;
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
                    Brand
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
                    <td className="px-4 py-3.5 font-mono text-[var(--text-muted)]">{s.rank}</td>
                    <td className="px-4 py-3.5 font-medium">{s.brandName}</td>
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
                      <DeltaBadge delta={getDelta(s.brandId, s.rank)} />
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
