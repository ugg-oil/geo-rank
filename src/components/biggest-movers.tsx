"use client";

import Link from "next/link";
import type { RankMover } from "@/lib/rank-change";
import { formatWeekLabel, getCategoryMessages } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/use-i18n";

function MoverChange({ mover }: { mover: RankMover }) {
  const { m } = useI18n();
  if (mover.direction === "up") {
    return <span className="font-mono text-sm font-medium text-[var(--green)]">↑{mover.spots}</span>;
  }
  if (mover.direction === "down") {
    return <span className="font-mono text-sm font-medium text-[var(--red)]">↓{mover.spots}</span>;
  }
  if (mover.direction === "new") {
    return (
      <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--card-hover)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
        {m.common.new}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 text-xs font-medium text-[var(--red)]">
      {m.common.out}
    </span>
  );
}

function MoverRow({ mover }: { mover: RankMover }) {
  const { m } = useI18n();
  const categoryName =
    getCategoryMessages(m, mover.categorySlug)?.name ?? mover.categoryName;
  const rankLabel =
    mover.direction === "out"
      ? `#${mover.previousRank} → ${m.movers.outSuffix}`
      : mover.previousRank != null
        ? `#${mover.previousRank} → #${mover.rank}`
        : `#${mover.rank}`;

  return (
    <Link
      href={`/brand/${mover.brandSlug}?from=${encodeURIComponent(`/category/${mover.categorySlug}`)}`}
      className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 transition-colors hover:border-[var(--border-hover)]"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-[var(--text)]">{mover.brandName}</div>
        <div className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
          {categoryName}
          <span className="mx-1.5 text-[var(--border-hover)]">·</span>
          <span className="font-mono">{rankLabel}</span>
        </div>
      </div>
      <MoverChange mover={mover} />
    </Link>
  );
}

export function BiggestMoversSection({
  week,
  risers,
  fallers,
}: {
  week: string;
  risers: RankMover[];
  fallers: RankMover[];
}) {
  const { m } = useI18n();
  if (risers.length === 0 && fallers.length === 0) return null;
  const weekLabel = formatWeekLabel(m, week);

  return (
    <section className="border-y border-[var(--border)]">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {m.movers.eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">{m.movers.title}</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {m.movers.subtitle(weekLabel)}
            </p>
          </div>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-[var(--green)]">{m.movers.rising}</h3>
            <div className="space-y-2">
              {risers.length > 0 ? (
                risers.map((mover) => (
                  <MoverRow key={`${mover.categorySlug}-${mover.brandId}-up`} mover={mover} />
                ))
              ) : (
                <p className="text-sm text-[var(--text-muted)]">{m.movers.noRisers}</p>
              )}
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-[var(--red)]">{m.movers.falling}</h3>
            <div className="space-y-2">
              {fallers.length > 0 ? (
                fallers.map((mover) => (
                  <MoverRow key={`${mover.categorySlug}-${mover.brandId}-down`} mover={mover} />
                ))
              ) : (
                <p className="text-sm text-[var(--text-muted)]">{m.movers.noFallers}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
