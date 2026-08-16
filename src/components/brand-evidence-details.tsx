"use client";

import { useMemo, useState } from "react";
import { engineLabel } from "@/lib/constants";
import { formatWeekLabel, getCategoryMessages } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { BrandExcerptGroup } from "@/lib/brand-page-build";

type EngineGroup = {
  engine: string;
  items: BrandExcerptGroup[];
};

export function BrandEvidenceDetails({
  groups,
  week,
}: {
  groups: BrandExcerptGroup[];
  week: string;
}) {
  const { m } = useI18n();
  const byEngine = useMemo(() => {
    const map = new Map<string, BrandExcerptGroup[]>();
    for (const group of groups) {
      const list = map.get(group.engine) ?? [];
      list.push(group);
      map.set(group.engine, list);
    }
    const engines: EngineGroup[] = [...map.entries()]
      .map(([engine, items]) => ({
        engine,
        items: items.sort((a, b) => a.categorySlug.localeCompare(b.categorySlug)),
      }))
      .sort((a, b) => a.engine.localeCompare(b.engine));
    return engines;
  }, [groups]);

  const [openEngines, setOpenEngines] = useState<Set<string>>(() => {
    const engines = [...new Set(groups.map((g) => g.engine))].sort();
    return engines[0] ? new Set([engines[0]]) : new Set();
  });

  if (groups.length === 0) return null;

  const weekLabel = formatWeekLabel(m, week);
  const engineCount = byEngine.length;

  function toggleEngine(engine: string) {
    setOpenEngines((prev) => {
      const next = new Set(prev);
      if (next.has(engine)) next.delete(engine);
      else next.add(engine);
      return next;
    });
  }

  function expandAll() {
    setOpenEngines(new Set(byEngine.map((g) => g.engine)));
  }

  function collapseAll() {
    setOpenEngines(new Set());
  }

  return (
    <details open className="group border-t border-[var(--border)] pt-6">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)] [&::-webkit-details-marker]:hidden">
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
          className="shrink-0 transition-transform duration-200 group-open:rotate-90"
        >
          <path
            d="M4.5 2.5L8 6l-3.5 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="font-mono text-xs uppercase tracking-[0.18em]">
          {m.brand.evidenceTitle}
        </span>
        <span className="text-xs normal-case tracking-normal">
          · {m.brand.evidenceCount(engineCount)}
        </span>
      </summary>
      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--text-muted)]">{m.brand.evidenceLead}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{m.brand.basedOn(weekLabel)}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="rounded-md border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--card-hover)]"
            >
              {m.brand.evidenceExpandAll}
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="rounded-md border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--card-hover)]"
            >
              {m.brand.evidenceCollapseAll}
            </button>
          </div>
        </div>
        <div className="space-y-3">
          {byEngine.map((group) => {
            const open = openEngines.has(group.engine);
            return (
              <div
                key={group.engine}
                className="rounded-lg border border-[var(--border)] bg-[var(--card)]"
              >
                <button
                  type="button"
                  onClick={() => toggleEngine(group.engine)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-[var(--text)]"
                  aria-expanded={open}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden
                    className={`shrink-0 text-[var(--text-muted)] transition-transform ${open ? "rotate-90" : ""}`}
                  >
                    <path
                      d="M4.5 2.5L8 6l-3.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {engineLabel(group.engine)}
                  <span className="font-normal text-xs text-[var(--text-muted)]">
                    · {group.items.length}
                  </span>
                </button>
                {open && (
                  <div className="space-y-4 border-t border-[var(--border)] px-4 py-3">
                    {group.items.map((item) => (
                      <div key={`${item.categorySlug}-${item.engine}`}>
                        <p className="text-xs font-medium text-[var(--text-secondary)]">
                          {getCategoryMessages(m, item.categorySlug)?.name ?? item.categorySlug}
                        </p>
                        <p
                          className="mt-2 border-l-2 border-[var(--border)] pl-3 text-sm leading-6 text-[var(--text-secondary)]"
                          lang="en"
                        >
                          {item.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </details>
  );
}
