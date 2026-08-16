"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { RankMover } from "@/lib/rank-change";
import { formatWeekLabel, getCategoryMessages } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/use-i18n";

const PILL = "rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold tabular-nums";

function MoverChange({ mover }: { mover: RankMover }) {
  const { m } = useI18n();
  if (mover.direction === "up") {
    return (
      <span className={`${PILL} bg-[var(--green)]/12 text-[var(--green)]`}>
        ↑{mover.spots}
      </span>
    );
  }
  if (mover.direction === "down") {
    return (
      <span className={`${PILL} bg-[var(--red)]/12 text-[var(--red)]`}>
        ↓{mover.spots}
      </span>
    );
  }
  if (mover.direction === "new") {
    return (
      <span className={`${PILL} bg-[var(--yellow)]/14 text-[11px] uppercase tracking-wide text-[var(--text)]`}>
        {m.common.new}
      </span>
    );
  }
  return (
    <span className={`${PILL} bg-[var(--red)]/12 text-[11px] uppercase tracking-wide text-[var(--red)]`}>
      {m.common.out}
    </span>
  );
}

function MoverRow({ mover, index }: { mover: RankMover; index: number }) {
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
    <div className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-[var(--card)]">
      <span className="w-3 shrink-0 font-mono text-[11px] tabular-nums text-[var(--text-muted)]">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          href={`/brand/${mover.brandSlug}?from=${encodeURIComponent(`/category/${mover.categorySlug}`)}`}
          className="block truncate text-sm font-medium text-[var(--text)] hover:underline"
        >
          {mover.brandName}
        </Link>
        <Link
          href={`/category/${mover.categorySlug}`}
          className="mt-0.5 block truncate text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]"
        >
          {categoryName}
        </Link>
      </div>
      <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--text-muted)]">
        {rankLabel}
      </span>
      <MoverChange mover={mover} />
    </div>
  );
}

function MoverColumn({
  title,
  tone,
  movers,
  emptyText,
}: {
  title: string;
  tone: "up" | "down";
  movers: RankMover[];
  emptyText: string;
}) {
  return (
    <div className="-mx-3">
      <div className="flex items-center gap-2 px-3 pb-2.5">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            tone === "up" ? "bg-[var(--green)]" : "bg-[var(--red)]"
          }`}
        />
        <h3 className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          {title}
        </h3>
      </div>
      {movers.length > 0 ? (
        <div
          className={`divide-y divide-[var(--border)]/60 border-t ${
            tone === "up" ? "border-[var(--green)]/40" : "border-[var(--red)]/40"
          }`}
        >
          {movers.map((mover, index) => (
            <MoverRow
              key={`${mover.categorySlug}-${mover.brandId}-${tone}`}
              mover={mover}
              index={index}
            />
          ))}
        </div>
      ) : (
        <p className="border-t border-[var(--border)]/60 px-3 py-4 text-sm text-[var(--text-muted)]">
          {emptyText}
        </p>
      )}
    </div>
  );
}

export function BiggestMoversSection({
  week,
  risers,
  fallers,
  insightsSlot,
}: {
  week: string;
  risers: RankMover[];
  fallers: RankMover[];
  insightsSlot?: ReactNode;
}) {
  const { m } = useI18n();
  if (risers.length === 0 && fallers.length === 0) return null;
  const weekLabel = formatWeekLabel(m, week);

  return (
    <section>
      <div className="mx-auto max-w-6xl px-6 pt-2 pb-12 sm:pb-14">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {m.movers.title}
          </h2>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {m.movers.eyebrow}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">
          {m.movers.subtitle(weekLabel)}
        </p>

        {insightsSlot}

        <div className="mt-7 grid gap-x-8 gap-y-7 sm:grid-cols-2">
          <MoverColumn
            title={m.movers.rising}
            tone="up"
            movers={risers}
            emptyText={m.movers.noRisers}
          />
          <MoverColumn
            title={m.movers.falling}
            tone="down"
            movers={fallers}
            emptyText={m.movers.noFallers}
          />
        </div>
      </div>
    </section>
  );
}
