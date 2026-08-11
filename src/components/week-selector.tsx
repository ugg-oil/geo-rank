"use client";

import { formatWeekLabel } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/use-i18n";

type Props = {
  slug: string;
  week: string;
  availableWeeks: string[];
  engine?: string;
};

export function WeekSelector({ slug, week, availableWeeks, engine }: Props) {
  const { m } = useI18n();
  if (availableWeeks.length === 0) return null;

  const latest = availableWeeks[0]?.replace("Week of ", "");
  const current = week.replace("Week of ", "");

  return (
    <label className="relative inline-flex shrink-0 items-center">
      <span className="sr-only">{m.common.changeWeek}</span>
      <select
        value={current}
        onChange={(event) => {
          const params = new URLSearchParams();
          if (event.target.value !== latest) params.set("week", event.target.value);
          if (engine && engine !== "overall") params.set("engine", engine);
          window.location.assign(`/category/${slug}${params.size ? `?${params}` : ""}`);
        }}
        className="appearance-none rounded-lg border border-[var(--border)] bg-[var(--card)] py-2 pl-3.5 pr-10 text-sm font-medium text-[var(--text)] shadow-[0_1px_0_rgba(0,0,0,0.03)] transition-colors hover:border-[var(--border-hover)] focus:border-[var(--border-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--border-hover)]"
      >
        {availableWeeks.map((item) => (
          <option key={item} value={item.replace("Week of ", "")}>
            {formatWeekLabel(m, item)}
          </option>
        ))}
      </select>
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[var(--text-secondary)]"
      >
        <path
          d="M3.5 5.25 7 8.75l3.5-3.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </label>
  );
}
