import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <span className="font-medium text-[var(--text-secondary)]">GEO Radar</span>
          <span>·</span>
          <span>Data via official APIs</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">Updated weekly</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <Link
            href="/methodology"
            className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Methodology
          </Link>
          <span className="text-[var(--text-muted)]">ChatGPT · Gemini · Grok</span>
        </div>
      </div>
    </footer>
  );
}
