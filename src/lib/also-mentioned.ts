import { prisma } from "@/lib/db";
import { isExcludedFromCategory } from "@/lib/entity-audit";
import type { AlsoMentionedRow } from "@/lib/leaderboard-data";
import { getCompanyColumnName, getProductDisplayName } from "@/lib/parent-company";
import { toBrandSlug } from "@/lib/brand-slug";
import { findPreviousPublishedPeriod } from "@/lib/period-sequence";
import { toStoragePeriodKey } from "@/lib/period";

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

async function appearancesForPeriod(
  category: string,
  week: string,
  rankableBrandIds: Set<string>
): Promise<{ totalResponses: number; byBrand: Map<string, number> }> {
  const responses = await prisma.response.findMany({
    where: { week, category, status: "ok" },
    select: { id: true },
  });
  if (responses.length === 0) {
    return { totalResponses: 0, byBrand: new Map() };
  }
  const responseIds = responses.map((r) => r.id);
  const mentions = await prisma.resolvedMention.findMany({
    where: { responseId: { in: responseIds } },
    select: { brandId: true, responseId: true },
  });

  const byBrandResponses = new Map<string, Set<string>>();
  for (const m of mentions) {
    if (!rankableBrandIds.has(m.brandId)) continue;
    if (!byBrandResponses.has(m.brandId)) byBrandResponses.set(m.brandId, new Set());
    byBrandResponses.get(m.brandId)!.add(m.responseId);
  }

  const byBrand = new Map<string, number>();
  for (const [brandId, set] of byBrandResponses) {
    byBrand.set(brandId, set.size);
  }
  return { totalResponses: responses.length, byBrand };
}

async function lookbackPeriodKeys(category: string, week: string): Promise<string[]> {
  const keys: string[] = [toStoragePeriodKey(week)];
  let cursor = keys[0]!;
  while (keys.length < ALSO_MENTIONED_LOOKBACK) {
    const prev = await findPreviousPublishedPeriod(category, cursor);
    if (!prev) break;
    keys.push(prev);
    cursor = prev;
  }
  return keys;
}

/**
 * Build Also mentioned rows for a category board (publish / DB fallback).
 */
export async function buildAlsoMentioned(
  category: string,
  week: string,
  top20BrandIds: Set<string>
): Promise<AlsoMentionedRow[]> {
  const brands = await prisma.brand.findMany({
    where: { rankingEnabled: true, entityType: "product" },
    select: {
      id: true,
      canonicalName: true,
      parentBrand: { select: { canonicalName: true } },
    },
  });
  const rankable = new Set(
    brands
      .filter((b) => !isExcludedFromCategory(b.canonicalName, category))
      .map((b) => b.id)
  );

  const periods = await lookbackPeriodKeys(category, week);
  const currentWeek = periods[0]!;
  const current = await appearancesForPeriod(category, currentWeek, rankable);
  const priorByBrand = new Map<string, number>();

  for (const period of periods.slice(1)) {
    const prior = await appearancesForPeriod(category, period, rankable);
    for (const [brandId, count] of prior.byBrand) {
      priorByBrand.set(brandId, (priorByBrand.get(brandId) ?? 0) + count);
    }
  }

  const pageBrandIds = new Set(
    (
      await prisma.snapshot.findMany({
        where: { week: currentWeek, engine: null },
        select: { brandId: true },
        distinct: ["brandId"],
      })
    ).map((s) => s.brandId)
  );

  const brandMeta = new Map<
    string,
    { name: string; parentCompanyName: string | null; hasBrandPage: boolean }
  >();
  for (const b of brands) {
    if (!rankable.has(b.id)) continue;
    const name = getProductDisplayName(b.canonicalName);
    brandMeta.set(b.id, {
      name,
      parentCompanyName: getCompanyColumnName(
        b.canonicalName,
        b.parentBrand?.canonicalName
      ),
      hasBrandPage: pageBrandIds.has(b.id),
    });
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
