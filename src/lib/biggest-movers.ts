import { CATEGORY_SLUG_MAP } from "@/lib/categories";
import { prisma } from "@/lib/db";
import { toBrandSlug } from "@/lib/brand-slug";
import { getCompanyColumnName, getProductDisplayName } from "@/lib/parent-company";
import { getPublishedLeaderboardWeeks } from "@/lib/published-leaderboard";
import {
  collectCategoryMovers,
  pickBiggestMovers,
  type RankMover,
} from "@/lib/rank-change";
import { ttlCache } from "@/lib/ttl-cache";
import { cache } from "react";

export type BiggestMoversResult = {
  week: string;
  previousWeek: string | null;
  risers: RankMover[];
  fallers: RankMover[];
};

type OverallRow = {
  week: string;
  category: string;
  rank: number;
  brandId: string;
  canonicalName: string;
  parentName: string | null;
};

function rowsToBoard(rows: OverallRow[]) {
  const snapshots = rows
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .map((row) => {
      const brandName = getProductDisplayName(row.canonicalName);
      return {
        brandId: row.brandId,
        brandName,
        brandSlug: toBrandSlug(brandName),
        parentCompanyName: getCompanyColumnName(row.canonicalName, row.parentName),
        rank: row.rank,
      };
    });
  return snapshots;
}

async function loadBiggestMovers(limit: number): Promise<BiggestMoversResult | null> {
  const weeks = await getPublishedLeaderboardWeeks();
  if (weeks.length === 0) return null;

  const week = weeks[0]!;
  const previousWeek = weeks[1] ?? null;
  const weekKeys = previousWeek ? [week, previousWeek] : [week];

  const snaps = await prisma.snapshot.findMany({
    where: { engine: null, week: { in: weekKeys } },
    select: {
      week: true,
      category: true,
      rank: true,
      brandId: true,
      brand: {
        select: {
          canonicalName: true,
          parentBrand: { select: { canonicalName: true } },
        },
      },
    },
  });

  const byWeekCategory = new Map<string, OverallRow[]>();
  for (const snap of snaps) {
    const key = `${snap.week}::${snap.category}`;
    const list = byWeekCategory.get(key) ?? [];
    list.push({
      week: snap.week,
      category: snap.category,
      rank: snap.rank,
      brandId: snap.brandId,
      canonicalName: snap.brand.canonicalName,
      parentName: snap.brand.parentBrand?.canonicalName ?? null,
    });
    byWeekCategory.set(key, list);
  }

  const allMovers: RankMover[] = [];
  for (const [slug, categoryName] of Object.entries(CATEGORY_SLUG_MAP)) {
    const current = rowsToBoard(byWeekCategory.get(`${week}::${categoryName}`) ?? []);
    const previous = previousWeek
      ? rowsToBoard(byWeekCategory.get(`${previousWeek}::${categoryName}`) ?? [])
      : [];
    if (current.length === 0 || previous.length === 0) continue;

    const prevRanks = Object.fromEntries(previous.map((row) => [row.brandId, row.rank]));
    const prevNames = Object.fromEntries(
      previous.map((row) => [
        row.brandId,
        {
          brandName: row.brandName,
          brandSlug: row.brandSlug,
          parentCompanyName: row.parentCompanyName,
        },
      ])
    );
    allMovers.push(
      ...collectCategoryMovers(
        { snapshots: current, prevRanks, hasPrevWeekData: true },
        slug,
        categoryName,
        prevNames
      )
    );
  }

  if (allMovers.length === 0) {
    return { week, previousWeek, risers: [], fallers: [] };
  }

  const { risers, fallers } = pickBiggestMovers(allMovers, limit);
  return { week, previousWeek, risers, fallers };
}

/**
 * Homepage movers: overall snapshots for latest two published weeks only.
 * Do not build full category boards (engines / also-mentioned / highlight).
 */
export const getBiggestMovers = cache(async (limit = 5): Promise<BiggestMoversResult | null> => {
  return ttlCache(`biggest-movers:${limit}`, 60_000, () => loadBiggestMovers(limit));
});
