"use client";

import { useI18n } from "@/lib/i18n/use-i18n";

export function LocaleToggle() {
  const { locale, m, toggleLocale } = useI18n();
  const label = locale === "en" ? m.locale.switchToZh : m.locale.switchToEn;

  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={label}
      title={label}
      className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] px-2 font-mono text-[11px] font-medium tracking-wide text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text)]"
    >
      {locale === "en" ? m.locale.shortZh : m.locale.shortEn}
    </button>
  );
}
