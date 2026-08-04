"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/rankings", label: "Rankings", match: (path: string) => path === "/rankings" || path.startsWith("/category/") },
  { href: "/methodology", label: "Methodology", match: (path: string) => path === "/methodology" },
] as const;

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-4 sm:gap-5">
      {LINKS.map((link) => {
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
