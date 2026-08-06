"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/use-i18n";

export function SiteNav() {
  const pathname = usePathname();
  const { m } = useI18n();

  const links = [
    {
      href: "/rankings",
      label: m.nav.rankings,
      match: (path: string) => path === "/rankings" || path.startsWith("/category/"),
    },
    {
      href: "/methodology",
      label: m.nav.methodology,
      match: (path: string) => path === "/methodology",
    },
  ] as const;

  return (
    <nav className="flex items-center gap-4 sm:gap-5">
      {links.map((link) => {
        const active = link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`text-sm transition-colors ${
              active
                ? "font-medium text-[var(--text)] underline decoration-[var(--border-hover)] underline-offset-8"
                : "text-[var(--text-secondary)] hover:text-[var(--text)]"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
