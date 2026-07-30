import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--card)] group-hover:border-[var(--border-hover)] transition-colors">
            <BrandMark size={14} />
          </div>
          <span className="text-sm font-semibold tracking-tight text-[var(--text)]">
            GEO Radar
          </span>
        </Link>

        <nav className="flex items-center gap-5">
          <Link
            href="/#rankings"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
          >
            Rankings
          </Link>
          <Link
            href="/methodology"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
          >
            Methodology
          </Link>
        </nav>
      </div>
    </header>
  );
}
