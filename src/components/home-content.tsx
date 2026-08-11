"use client";

import Link from "next/link";
import { BiggestMoversSection } from "@/components/biggest-movers";
import {
  CATEGORIES,
  COLLECTION_ENGINES,
  ENGINE_MODEL_LABELS,
  engineLabel,
} from "@/lib/constants";
import { getCategoryMessages } from "@/lib/i18n/messages";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { RankMover } from "@/lib/rank-change";

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="transition-transform group-hover:translate-x-0.5"
      aria-hidden
    >
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const CATEGORY_SHORTCUT_SLUGS = [
  "ai-tools",
  "saas-software",
  "ai-image-video-tools",
  "developer-tools",
  "marketing-tools",
  "vpn-services",
  "ecommerce-platforms",
  "online-course-platforms",
  "language-learning-apps",
  "password-managers",
  "ai-meeting-assistants",
  "ai-cybersecurity-tools",
  "recruiting-tools",
] as const;

type Props = {
  scoringEngineCount: number;
  promptCount: number;
  movers: { week: string; risers: RankMover[]; fallers: RankMover[] } | null;
};

export function HomeContent({
  scoringEngineCount,
  promptCount,
  movers,
}: Props) {
  const { m } = useI18n();
  // P0-7: homepage must not show a single global latest date.

  return (
    <>
      <section className="relative mx-auto max-w-6xl px-6 pt-16 pb-12 sm:pt-24 sm:pb-16">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <div className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs text-[var(--text-secondary)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--yellow)]" />
              {m.home.badgeFresh}
            </div>

            <h1 className="animate-fade-up-delay-1 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-6xl sm:leading-[1.08]">
              {m.home.h1Line1}
              <br />
              {m.home.h1Line2}
            </h1>

            <p className="animate-fade-up-delay-2 mt-6 max-w-xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
              {m.home.lead}
            </p>

            <div className="animate-fade-up-delay-3 mt-8 flex flex-wrap items-center gap-3">
              <Link href="/rankings" className="btn-primary px-5 py-2.5">
                {m.home.ctaRankings}
                <ArrowIcon />
              </Link>
              <Link
                href="/methodology"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text)]"
              >
                {m.home.ctaMethodology}
              </Link>
            </div>

            <div className="animate-fade-up-delay-3 mt-8 flex flex-wrap gap-2">
              {CATEGORY_SHORTCUT_SLUGS.map((slug) => {
                const cat = getCategoryMessages(m, slug);
                if (!cat) return null;
                return (
                  <Link
                    key={slug}
                    href={`/category/${slug}`}
                    className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text)]"
                  >
                    {cat.short}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="animate-fade-up-delay-2 hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 lg:block">
            <div className="mb-8 flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {m.home.whyTitle}
              </span>
              <span className="h-2 w-2 rounded-full bg-[var(--yellow)]" />
            </div>
            <p className="text-xl font-medium leading-snug tracking-tight text-[var(--text)]">
              {m.home.whyHeadline}
            </p>
            <div className="mt-8 space-y-4 border-t border-[var(--border)] pt-5">
              <div className="flex gap-3">
                <span className="font-mono text-xs text-[var(--text-muted)]">01</span>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{m.home.why1}</p>
              </div>
              <div className="flex gap-3">
                <span className="font-mono text-xs text-[var(--text-muted)]">02</span>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{m.home.why2}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="animate-fade-up-delay-3 mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
          {[
            { value: String(scoringEngineCount), label: m.home.statEngines },
            { value: String(CATEGORIES.length), label: m.home.statCategories },
            { value: String(promptCount), label: m.home.statPrompts },
            { value: "Top 20", label: m.home.statTop20 },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[var(--card)] px-5 py-4 text-center sm:text-left"
            >
              <div className="font-mono text-2xl font-semibold tracking-tight text-[var(--text)]">
                {stat.value}
              </div>
              <div className="mt-0.5 text-xs text-[var(--text-muted)]">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {movers && (movers.risers.length > 0 || movers.fallers.length > 0) && (
        <BiggestMoversSection
          week={movers.week}
          risers={movers.risers}
          fallers={movers.fallers}
        />
      )}

      <section className="border-y border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-8 sm:flex-row sm:items-center">
          <p className="text-sm text-[var(--text-muted)]">{m.home.engineStrip}</p>
          <div className="flex flex-wrap gap-3">
            {COLLECTION_ENGINES.map((engine) => (
              <div
                key={engine}
                className="flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3.5 py-2"
              >
                <span className="text-sm font-medium">{engineLabel(engine)}</span>
                <span className="font-mono text-xs text-[var(--text-muted)]">
                  {ENGINE_MODEL_LABELS[engine]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <h2 className="mb-12 text-center text-xl font-semibold tracking-tight sm:text-2xl">
            {m.home.howTitle}
          </h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              { step: "01", title: m.home.how1Title, desc: m.home.how1Desc },
              { step: "02", title: m.home.how2Title, desc: m.home.how2Desc },
              { step: "03", title: m.home.how3Title, desc: m.home.how3Desc },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="mb-3 font-mono text-xs text-[var(--text-muted)]">{item.step}</div>
                <h3 className="mb-2 text-base font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--text-muted)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
