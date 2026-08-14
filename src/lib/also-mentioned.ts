import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isExcludedFromCategory } from "@/lib/entity-audit";
import type { AlsoMentionedRow } from "@/lib/leaderboard-data";
import { getCompanyColumnName, getProductDisplayName } from "@/lib/parent-company";
import { toBrandSlug } from "@/lib/brand-slug";
import { listPublishedOverallWeeks } from "@/lib/period-sequence";
import { toStoragePeriodKey } from "@/lib/period";
import { ttlCache } from "@/lib/ttl-cache";

export type { AlsoMentionedRow };

export const ALSO_MENTIONED_LOOKBACK = 4;
export const ALSO_MENTIONED_MIN_CUMULATIVE = 2;
export const ALSO_MENTIONED_LIMIT = 10;

export type PeriodAppearance = {
  brandId: string;
  appearances: number;
  totalResponses: number;
};

/**
 * Pure selection: candidates mentioned this period, not in Top 20,
 * cumulative appearances across lookback ≥ min, sort by current mentionRate.
 */
export function selectAlsoMentioned(args: {
  top20BrandIds: Set<string>;
  /** Current period appearances by brandId */
  current: PeriodAppearance[];
  /** Prior periods (excluding current) appearances by brandId — summed with current */
  priorByBrand: Map<string, number>;
  brandMeta: Map<
    string,
    { name: string; parentCompanyName: string | null; hasBrandPage: boolean }
  >;
  minCumulative?: number;
  limit?: number;
}): AlsoMentionedRow[] {
  const minCumulative = args.minCumulative ?? ALSO_MENTIONED_MIN_CUMULATIVE;
  const limit = args.limit ?? ALSO_MENTIONED_LIMIT;
  const rows: AlsoMentionedRow[] = [];

  for (const row of args.current) {
    if (args.top20BrandIds.has(row.brandId)) continue;
    if (row.appearances <= 0 || row.totalResponses <= 0) continue;
    const prior = args.priorByBrand.get(row.brandId) ?? 0;
    const cumulative = row.appearances + prior;
    if (cumulative < minCumulative) continue;
    const meta = args.brandMeta.get(row.brandId);
    if (!meta) continue;
    rows.push({
      brandId: row.brandId,
      brandName: meta.name,
      brandSlug: toBrandSlug(meta.name),
      parentCompanyName: meta.parentCompanyName,
      mentionRate: row.appearances / row.totalResponses,
      cumulativeMentions: cumulative,
      hasBrandPage: meta.hasBrandPage,
    });
  }

  rows.sort((a, b) => {
    if (b.mentionRate !== a.mentionRate) return b.mentionRate - a.mentionRate;
    if (b.cumulativeMentions !== a.cumulativeMentions) {
      return b.cumulativeMentions - a.cumulativeMentions;
    }
    return a.brandSlug.localeCompare(b.brandSlug);
  });

  return rows.slice(0, limit);
}

async function appearancesForPeriods(
  category: string,
  periods: string[]
): Promise<Map<string, { totalResponses: number; byBrand: Map<string, number> }>> {
  const out = new Map<string, { totalResponses: number; byBrand: Map<string, number> }>();
  for (const period of periods) {
    out.set(period, { totalResponses: 0, byBrand: new Map() });
  }
  if (periods.length === 0) return out;

  const totals = await prisma.$queryRaw<Array<{ week: string; total: number }>>(Prisma.sql`
      SELECT week, COUNT(*)::int AS total
      FROM responses
      WHERE category = ${category}
        AND status = 'ok'
        AND week IN (${Prisma.join(periods)})
      GROUP BY week
    `);
  const counts = await prisma.$queryRaw<Array<{ week: string; brandId: string; appearances: number }>>(Prisma.sql`
      SELECT r.week, rm.brand_id AS "brandId", COUNT(DISTINCT rm.response_id)::int AS appearances
      FROM responses r
      INNER JOIN resolved_mentions rm ON rm.response_id = r.id
      WHERE r.category = ${category}
        AND r.status = 'ok'
        AND r.week IN (${Prisma.join(periods)})
      GROUP BY r.week, rm.brand_id
    `);

  for (const row of totals) {
    const bucket = out.get(row.week);
    if (bucket) bucket.totalResponses = row.total;
  }
  for (const row of counts) {
    const bucket = out.get(row.week);
    if (bucket) bucket.byBrand.set(row.brandId, row.appearances);
  }
  return out;
}

async function loadAlsoMentioned(
  category: string,
  week: string,
  top20BrandIds: Set<string>
): Promise<AlsoMentionedRow[]> {
  const weeks = await listPublishedOverallWeeks(category);
  const currentKey = toStoragePeriodKey(week);
  const start = weeks.indexOf(currentKey);
  const periods =
    start >= 0
      ? weeks.slice(start, start + ALSO_MENTIONED_LOOKBACK)
      : [currentKey];

  const byPeriod = await appearancesForPeriods(category, periods);
  const current = byPeriod.get(currentKey);
  if (!current) return [];

  const candidateIds = [...current.byBrand.keys()].filter(
    (brandId) => !top20BrandIds.has(brandId)
  );
  if (candidateIds.length === 0) return [];

  const brands = await prisma.brand.findMany({
    where: { id: { in: candidateIds } },
    select: {
      id: true,
      canonicalName: true,
      rankingEnabled: true,
      entityType: true,
      parentBrand: { select: { canonicalName: true } },
    },
  });
  const pageSnaps = await prisma.snapshot.findMany({
    where: {
      week: currentKey,
      engine: null,
      brandId: { in: candidateIds },
    },
    select: { brandId: true },
    distinct: ["brandId"],
  });

  const pageBrandIds = new Set(pageSnaps.map((row) => row.brandId));
  const brandMeta = new Map<
    string,
    { name: string; parentCompanyName: string | null; hasBrandPage: boolean }
  >();
  for (const brand of brands) {
    if (!brand.rankingEnabled || brand.entityType !== "product") continue;
    if (isExcludedFromCategory(brand.canonicalName, category)) continue;
    const name = getProductDisplayName(brand.canonicalName);
    brandMeta.set(brand.id, {
      name,
      parentCompanyName: getCompanyColumnName(
        brand.canonicalName,
        brand.parentBrand?.canonicalName
      ),
      hasBrandPage: pageBrandIds.has(brand.id),
    });
  }

  const priorByBrand = new Map<string, number>();
  for (const period of periods) {
    if (period === currentKey) continue;
    const prior = byPeriod.get(period);
    if (!prior) continue;
    for (const [brandId, count] of prior.byBrand) {
      priorByBrand.set(brandId, (priorByBrand.get(brandId) ?? 0) + count);
    }
  }

  const currentRows: PeriodAppearance[] = [...current.byBrand.entries()].map(
    ([brandId, appearances]) => ({
      brandId,
      appearances,
      totalResponses: current.totalResponses,
    })
  );

  return selectAlsoMentioned({
    top20BrandIds,
    current: currentRows,
    priorByBrand,
    brandMeta,
  });
}

/**
 * Also-mentioned preview. Does not load the full brand table.
 */
export async function buildAlsoMentioned(
  category: string,
  week: string,
  top20BrandIds: Set<string>
): Promise<AlsoMentionedRow[]> {
  const topKey = [...top20BrandIds].sort().join(",");
  return ttlCache(`also-mentioned:${category}:${week}:${topKey}`, 60_000, () =>
    loadAlsoMentioned(category, week, top20BrandIds)
  );
}
