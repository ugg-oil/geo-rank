import Link from "next/link";

const STATS = [
  { value: "3", label: "AI Engines" },
  { value: "5", label: "Categories" },
  { value: "120", label: "Weekly Queries" },
  { value: "Top 20", label: "Per Category" },
];

const ENGINES = [
  { name: "ChatGPT", model: "GPT-4o" },
  { name: "Gemini", model: "2.5 Flash" },
  { name: "Grok", model: "Grok 4.5" },
];

const CATEGORY_CARDS = [
  {
    name: "AI Tools",
    slug: "ai-tools",
    description: "Conversational AI, copilots, and productivity assistants",
    count: "Top 20",
  },
  {
    name: "SaaS Software",
    slug: "saas-software",
    description: "Business software and cloud applications",
    count: "Top 20",
  },
  {
    name: "AI Image / Video",
    slug: "ai-image-video-tools",
    description: "Generative media, editing, and creative AI platforms",
    count: "Top 20",
  },
  {
    name: "Developer Tools",
    slug: "developer-tools",
    description: "IDEs, APIs, deployment, and engineering workflows",
    count: "Top 20",
  },
  {
    name: "Marketing Tools",
    slug: "marketing-tools",
    description: "Analytics, automation, and growth platforms",
    count: "Top 20",
  },
];

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

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 sm:pt-28 sm:pb-20">
        <div className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs text-[var(--text-secondary)]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--yellow)] opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--yellow)]" />
          </span>
          Weekly rankings · Updated every Monday
        </div>

        <h1 className="animate-fade-up-delay-1 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-6xl sm:leading-[1.08]">
          Which products
          <br />
          show up in AI answers?
        </h1>

        <p className="animate-fade-up-delay-2 mt-6 max-w-xl text-base leading-relaxed text-[var(--text-secondary)] sm:text-lg">
          SEO decides where you rank in search results.
          <br />
          GEO decides whether AI recommends you.
        </p>

        {/* Stats bar */}
        <div className="animate-fade-up-delay-3 mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-4">
          {STATS.map((stat) => (
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

      {/* Engine strip */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-8 sm:flex-row sm:items-center">
          <p className="text-sm text-[var(--text-muted)]">
            Tracked across three leading AI engines via official APIs
          </p>
          <div className="flex flex-wrap gap-3">
            {ENGINES.map((engine) => (
              <div
                key={engine.name}
                className="flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3.5 py-2"
              >
                <span className="text-sm font-medium">{engine.name}</span>
                <span className="font-mono text-xs text-[var(--text-muted)]">{engine.model}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Category Rankings
            </h2>
            <p className="mt-1.5 text-sm text-[var(--text-muted)]">
              Dynamically discovered brands, scored and ranked weekly
            </p>
          </div>
          <Link
            href="/methodology"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors"
          >
            How scoring works
            <ArrowIcon />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_CARDS.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="group card-shine relative flex flex-col rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 transition-all hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)]"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-xs text-[var(--text-muted)]">{cat.count}</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-muted)] transition-colors group-hover:border-[var(--border-hover)] group-hover:text-[var(--text)]">
                  <ArrowIcon />
                </span>
              </div>
              <h3 className="text-base font-semibold tracking-tight group-hover:text-[var(--text)] transition-colors">
                {cat.name}
              </h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-[var(--text-muted)]">
                {cat.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[var(--border)] bg-[var(--bg-elevated)]">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <h2 className="mb-12 text-center text-xl font-semibold tracking-tight sm:text-2xl">
            From AI response to ranked leaderboard
          </h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "Collect",
                desc: "8 category-specific prompts × 3 engines, every week via official APIs",
              },
              {
                step: "02",
                title: "Extract & Normalize",
                desc: "LLM extracts brand mentions, matches aliases, and deduplicates names",
              },
              {
                step: "03",
                title: "Score & Publish",
                desc: "Weighted GEO score ranks Top 20 with week-over-week movement",
              },
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
    </main>
  );
}
