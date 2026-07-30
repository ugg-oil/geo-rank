import Link from "next/link";

const SECTIONS = [
  {
    title: "What is GEO?",
    content: (
      <p>
        GEO (Generative Engine Optimization) measures how often and how prominently
        AI engines recommend specific products and brands. Unlike SEO which tracks search
        result rankings, GEO tracks whether AI recommends you when users ask for product
        suggestions.
      </p>
    ),
  },
  {
    title: "Data Collection",
    content: (
      <>
        <p>
          Every week, we query three AI engines — <strong className="text-[var(--text)]">ChatGPT</strong>,{" "}
          <strong className="text-[var(--text)]">Gemini</strong>, and{" "}
          <strong className="text-[var(--text)]">Grok</strong> — using 8 category-specific
          prompts per engine. All data is collected via official APIs, not web interfaces.
        </p>
        <p className="mt-3">
          Responses are processed by a separate LLM to extract brand mentions and their
          order of appearance. Extracted brands are matched against a canonical brand
          database with alias support.
        </p>
      </>
    ),
  },
  {
    title: "Scoring Formula",
    content: (
      <>
        <p className="mb-4">Each brand receives a GEO Score from 0 to 100:</p>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 font-mono text-sm text-[var(--text-secondary)]">
          Score = 0.50 × Appearance Rate + 0.40 × Avg Rank Score + 0.10 × Model Coverage
        </div>
        <ul className="mt-4 space-y-3">
          <li className="flex gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-muted)]" />
            <span>
              <strong className="text-[var(--text)]">Appearance Rate</strong> — percentage of
              valid responses that mention the brand
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-muted)]" />
            <span>
              <strong className="text-[var(--text)]">Avg Rank Score</strong> — exponential decay
              based on average position: 100 × e<sup>−0.15 × (avgRank − 1)</sup>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-muted)]" />
            <span>
              <strong className="text-[var(--text)]">Model Coverage</strong> — fraction of
              engines that mention the brand (overall ranking only)
            </span>
          </li>
        </ul>
      </>
    ),
  },
  {
    title: "Engine Rankings",
    content: (
      <>
        <p>Individual engine rankings use a simplified formula without model coverage:</p>
        <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 font-mono text-sm text-[var(--text-secondary)]">
          Engine Score = 0.55 × Appearance Rate + 0.45 × Avg Rank Score
        </div>
      </>
    ),
  },
  {
    title: "Dynamic Ranking",
    content: (
      <p>
        Rankings are not based on a fixed list. Each week, brands are dynamically
        discovered from AI responses. New brands are automatically added and scored.
        A human review process ensures brand names are properly normalized and
        deduplicated.
      </p>
    ),
  },
  {
    title: "Update Frequency",
    content: (
      <p>
        Rankings are updated weekly, every Monday. Data is labeled by the week&apos;s
        Monday date (e.g., &quot;Week of 2026-07-27&quot;).
      </p>
    ),
  },
];

export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10 sm:py-14">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to home
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Methodology</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        How GEO Radar collects, scores, and publishes weekly rankings
      </p>

      <div className="mt-12 space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.title} className="border-b border-[var(--border)] pb-10 last:border-b-0">
            <h2 className="mb-4 text-base font-semibold tracking-tight">{section.title}</h2>
            <div className="text-sm leading-relaxed text-[var(--text-secondary)]">
              {section.content}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
