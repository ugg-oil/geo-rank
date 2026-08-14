"use client";

import { engineLabel } from "@/lib/constants";
import { formatWeekLabel, getCategoryMessages } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { BrandExcerptGroup } from "@/lib/brand-page-build";

export function BrandEvidenceDetails({
  groups,
  week,
}: {
  groups: BrandExcerptGroup[];
  week: string;
}) {
  const { m } = useI18n();
  if (groups.length === 0) return null;
  const weekLabel = formatWeekLabel(m, week);
  const engineCount = new Set(groups.map((g) => g.engine)).size;

  return (
    <details className="group border-t border-[var(--border)] pt-6">
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
        <div>
          <p className="text-xs text-[var(--text-muted)]">{m.brand.evidenceLead}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{m.brand.basedOn(weekLabel)}</p>
        </div>
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={`${group.categorySlug}-${group.engine}`}>
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                {engineLabel(group.engine)}
                <span className="font-normal text-[var(--text-muted)]">
                  {" "}
                  · {getCategoryMessages(m, group.categorySlug)?.name ?? group.categorySlug}
                </span>
              </p>
              <p
                className="mt-2 border-l-2 border-[var(--border)] pl-3 text-sm leading-6 text-[var(--text-secondary)]"
                lang="en"
              >
                {group.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
