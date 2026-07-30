export default function CategoryLoading() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14 animate-pulse">
      <div className="mb-8 h-4 w-28 rounded bg-[var(--card-hover)]" />

      <div className="mb-8">
        <div className="h-8 w-64 rounded bg-[var(--card-hover)] sm:h-9" />
        <div className="mt-2 h-4 w-40 rounded bg-[var(--card)]" />
      </div>

      <div className="mb-8 flex flex-wrap gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-9 w-24 rounded-lg bg-[var(--card-hover)]"
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
          <div className="flex gap-8">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-3 w-16 rounded bg-[var(--card-hover)]" />
            ))}
          </div>
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-[var(--border)] bg-[var(--card)] px-4 py-3.5 last:border-b-0"
          >
            <div className="h-4 w-6 rounded bg-[var(--card-hover)]" />
            <div className="h-4 flex-1 max-w-[180px] rounded bg-[var(--card-hover)]" />
            <div className="h-4 w-12 rounded bg-[var(--card-hover)]" />
            <div className="h-4 w-12 rounded bg-[var(--card-hover)]" />
            <div className="h-4 w-12 rounded bg-[var(--card-hover)]" />
            <div className="h-4 w-12 rounded bg-[var(--card-hover)]" />
            <div className="h-4 w-10 rounded bg-[var(--card-hover)]" />
          </div>
        ))}
      </div>
    </main>
  );
}
