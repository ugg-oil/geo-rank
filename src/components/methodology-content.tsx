"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/use-i18n";

export function MethodologyContent() {
  const { m } = useI18n();
  const sections = m.methodology.sections;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {m.common.backToHome}
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {m.methodology.title}
      </h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{m.methodology.subtitle}</p>

      <div className="mt-12 space-y-10">
        {sections.map((section) => (
          <section key={section.title} className="border-b border-[var(--border)] pb-10 last:border-b-0">
            <h2 className="mb-4 text-base font-semibold tracking-tight">{section.title}</h2>
            <div className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {"intro" in section && section.intro && (
                <p className="mb-4">{section.intro}</p>
              )}
              {"paragraphs" in section &&
                section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-3 first:mt-0">
                    {paragraph}
                  </p>
                ))}
              {"formula" in section && section.formula && (
                <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 font-mono text-sm text-[var(--text-secondary)]">
                  {section.formula}
                </div>
              )}
              {"bullets" in section && section.bullets && (
                <ul className="mt-4 space-y-3">
                  {section.bullets.map((bullet) => (
                    <li key={bullet.label} className="flex gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-muted)]" />
                      <span>
                        <strong className="text-[var(--text)]">{bullet.label}</strong>
                        {bullet.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
