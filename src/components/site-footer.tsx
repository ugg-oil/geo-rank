"use client";

import Link from "next/link";
import { COLLECTION_ENGINES, engineLabel } from "@/lib/constants";
import { useI18n } from "@/lib/i18n/use-i18n";

export function SiteFooter() {
  const { m } = useI18n();

  return (
    <footer className="border-t border-[var(--border)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <span className="font-medium text-[var(--text-secondary)]">GEO Radar</span>
          <span>·</span>
          <span>{m.footer.dataVia}</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">{m.footer.updatedWeekly}</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <Link
            href="/rankings"
            className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            {m.nav.rankings}
          </Link>
          <Link
            href="/methodology"
            className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            {m.nav.methodology}
          </Link>
          <span className="text-[var(--text-muted)]">
            {COLLECTION_ENGINES.map(engineLabel).join(" · ")}
          </span>
        </div>
      </div>
    </footer>
  );
}
