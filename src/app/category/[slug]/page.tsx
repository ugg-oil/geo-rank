import { CATEGORY_SLUG_MAP } from "@/lib/categories";
import { ENGINES } from "@/lib/constants";
import { getAllCategoryLeaderboards } from "@/lib/leaderboard";
import { getPublishedCategoryLeaderboards } from "@/lib/published-leaderboard";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryBoard } from "./CategoryBoard";

export const revalidate = 300;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ engine?: string }>;
};

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { engine } = await searchParams;
  const category = CATEGORY_SLUG_MAP[slug];
  if (!category) notFound();

  const initialTab =
    engine && ENGINES.includes(engine as (typeof ENGINES)[number])
      ? (engine as (typeof ENGINES)[number])
      : "overall";

  const data =
    (await getPublishedCategoryLeaderboards(slug)) ??
    (await getAllCategoryLeaderboards(category));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        All categories
      </Link>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{category}</h1>
          <p className="mt-1.5 font-mono text-sm text-[var(--text-muted)]">
            {data.week} · Top 20
          </p>
        </div>
      </div>

      <CategoryBoard slug={slug} data={data} initialTab={initialTab} />
    </main>
  );
}
