import { CATEGORY_SLUG_MAP } from "@/lib/categories";
import type { BiggestMoversResult } from "@/lib/biggest-movers";
import {
  getPublishedCategoryLeaderboards,
  getPublishedWeeksForCategory,
} from "@/lib/published-leaderboard";
import { selectPeriodHighlight, type PeriodHighlight } from "@/lib/period-highlight";
import { normalizePeriodDate } from "@/lib/period";

export const HOME_TOP5_SLUG = "ai-tools";

export type HomeTop5Row = {
  rank: number;
  brandName: string;
  brandSlug: string;
  score: number;
};

export type HomeTop5Preview = {
  categorySlug: string;
  categoryName: string;
  week: string;
  periodStart: string;
  rows: HomeTop5Row[];
};

export type HomePeriodInsight = {
  kind: PeriodHighlight["kind"] | "cross_riser";
  brandName: string;
  brandSlug: string;
  categorySlug: string;
  categoryName: string;
  rank?: number;
  spots?: number;
  fromRank?: number | null;
  toRank?: number | null;
};

export type HomePeriodCardExtras = {
  mostVisible: { brandName: string; brandSlug: string; categorySlug: string } | null;
  biggestMover: {
    brandName: string;
    brandSlug: string;
    categorySlug: string;
    spots: number;
    direction: "up" | "down";
  } | null;
};

const INSIGHT_CATEGORY_SLUGS = ["ai-tools", "marketing-tools", "saas-software"] as const;

async function loadTop5Preview(): Promise<HomeTop5Preview | null> {
  const categoryName = CATEGORY_SLUG_MAP[HOME_TOP5_SLUG];
  if (!categoryName) return null;
  const weeks = await getPublishedWeeksForCategory(categoryName);
  const week = weeks[0];
  if (!week) return null;
  const boards = await getPublishedCategoryLeaderboards(HOME_TOP5_SLUG, week);
  const overall = boards?.boards.overall?.snapshots ?? [];
  if (overall.length === 0) return null;
  return {
    categorySlug: HOME_TOP5_SLUG,
    categoryName,
    week,
    periodStart: normalizePeriodDate(week),
    rows: overall.slice(0, 5).map((row) => ({
      rank: row.rank,
      brandName: row.brandName,
      brandSlug: row.brandSlug,
      score: row.score,
    })),
  };
}

async function loadCategoryHighlight(
  slug: string
): Promise<(HomePeriodInsight & { week: string }) | null> {
  const categoryName = CATEGORY_SLUG_MAP[slug];
  if (!categoryName) return null;
  const weeks = await getPublishedWeeksForCategory(categoryName);
  const week = weeks[0];
  if (!week) return null;
  const boards = await getPublishedCategoryLeaderboards(slug, week);
  const overall = boards?.boards.overall;
  if (!overall) return null;
  const highlight = selectPeriodHighlight({ overall });
  if (!highlight) return null;
  return {
    kind: highlight.kind,
    brandName: highlight.brandName,
    brandSlug: highlight.brandSlug,
    categorySlug: slug,
    categoryName,
    rank: highlight.rank,
    spots: highlight.spots,
    week,
  };
}

function buildPeriodInsights(
  movers: BiggestMoversResult | null,
  highlights: HomePeriodInsight[]
): HomePeriodInsight[] {
  const out: HomePeriodInsight[] = [];
  const seen = new Set<string>();

  const push = (item: HomePeriodInsight) => {
    const key = `${item.kind}:${item.brandSlug}:${item.categorySlug}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(item);
  };

  const bestRiser = movers?.risers[0];
  if (bestRiser && bestRiser.direction === "up") {
    push({
      kind: "cross_riser",
      brandName: bestRiser.brandName,
      brandSlug: bestRiser.brandSlug,
      categorySlug: bestRiser.categorySlug,
      categoryName: bestRiser.categoryName,
      spots: bestRiser.spots,
      fromRank: bestRiser.previousRank,
      toRank: bestRiser.rank,
    });
  }

  for (const h of highlights) {
    if (out.length >= 3) break;
    push(h);
  }

  return out.slice(0, 3);
}

function pickBiggestMover(
  movers: BiggestMoversResult | null
): HomePeriodCardExtras["biggestMover"] {
  if (!movers) return null;
  const candidates = [...movers.risers, ...movers.fallers].filter(
    (m) => m.direction === "up" || m.direction === "down"
  );
  if (candidates.length === 0) return null;
  const best = candidates.reduce((a, b) => (b.spots > a.spots ? b : a));
  return {
    brandName: best.brandName,
    brandSlug: best.brandSlug,
    categorySlug: best.categorySlug,
    spots: best.spots,
    direction: best.direction === "down" ? "down" : "up",
  };
}

export type HomePageBundle = {
  top5: HomeTop5Preview | null;
  insights: HomePeriodInsight[];
  periodCard: HomePeriodCardExtras;
};

export async function getHomePageBundle(
  movers: BiggestMoversResult | null
): Promise<HomePageBundle> {
  const [top5, ...highlightRows] = await Promise.all([
    loadTop5Preview(),
    ...INSIGHT_CATEGORY_SLUGS.map((slug) => loadCategoryHighlight(slug)),
  ]);
  const highlights = highlightRows.filter(
    (row): row is NonNullable<typeof row> => Boolean(row)
  );
  const mostVisible = top5?.rows[0]
    ? {
        brandName: top5.rows[0].brandName,
        brandSlug: top5.rows[0].brandSlug,
        categorySlug: top5.categorySlug,
      }
    : null;
  return {
    top5,
    insights: buildPeriodInsights(movers, highlights),
    periodCard: {
      mostVisible,
      biggestMover: pickBiggestMover(movers),
    },
  };
}
