import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { LocaleToggle } from "@/components/locale-toggle";
import { SiteNav } from "@/components/site-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <BrandMark
            size={28}
            className="shrink-0 rounded-[7px] ring-1 ring-[color-mix(in_srgb,var(--text)_14%,transparent)]"
          />
          <span className="text-sm font-semibold tracking-tight text-[var(--text)]">
            GEO Radar
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          <SiteNav />
          <div className="flex items-center gap-2">
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
