import { prisma } from "@/lib/db";
import {
  COLLECTION_ENGINES,
  SCORE_WEIGHTS,
  TOP_N,
} from "@/lib/constants";
import { isExcludedFromCategory } from "@/lib/entity-audit";
import {
  canPublishOverall,
  isEngineValid,
  modelCoverageScore,
  selectScoringEngines,
} from "@/lib/engine-scoring";

interface BrandStats {
  brandId: string;
  appearances: number;
  totalResponses: number;
  rankSum: number;
  rankCount: number;
  engines: Set<string>;
}

async function getRankableBrandIds(category: string): Promise<Set<string>> {
  const brands = await prisma.brand.findMany({
    where: { rankingEnabled: true, entityType: "product" },
    select: { id: true, canonicalName: true },
  });
  return new Set(
    brands
      .filter((brand) => !isExcludedFromCategory(brand.canonicalName, category))
      .map((brand) => brand.id)
  );
}

export async function scoreCategory(
  week: string,
  category: string,
  options?: { force?: boolean }
) {
  if (options?.force) {
    await prisma.snapshot.deleteMany({ where: { week, category } });
  } else {
    const existingSnaps = await prisma.snapshot.findFirst({
      where: { week, category },
    });
    if (existingSnaps) return;
  }

  const engineValidity = new Map<string, boolean>();

  for (const engine of COLLECTION_ENGINES) {
    const total = await prisma.response.count({
      where: { week, category, engine },
    });
    const ok = await prisma.response.count({
      where: { week, category, engine, status: "ok" },
    });
    engineValidity.set(engine, isEngineValid({ total, ok }));
  }

  const scoringEngines = selectScoringEngines(engineValidity);
  const rankableIds = await getRankableBrandIds(category);

  for (const engine of scoringEngines) {
    const responses = await prisma.response.findMany({
      where: { week, category, engine, status: "ok" },
      select: { id: true },
    });
    const responseIds = responses.map((r) => r.id);

    const mentions = await prisma.resolvedMention.findMany({
      where: { responseId: { in: responseIds }, brandId: { in: [...rankableIds] } },
    });

    const stats = new Map<string, { appearances: number; totalResponses: number; rankSum: number; rankCount: number }>();

    for (const m of mentions) {
      let s = stats.get(m.brandId);
      if (!s) {
        s = { appearances: 0, totalResponses: responseIds.length, rankSum: 0, rankCount: 0 };
        stats.set(m.brandId, s);
      }
      s.rankSum += m.position;
      s.rankCount++;
    }

    const seenBrands = new Map<string, Set<string>>();
    for (const m of mentions) {
      if (!seenBrands.has(m.brandId)) seenBrands.set(m.brandId, new Set());
      seenBrands.get(m.brandId)!.add(m.responseId);
    }
    for (const [brandId, responseSet] of seenBrands) {
      const s = stats.get(brandId)!;
      s.appearances = responseSet.size;
    }

    const scored = Array.from(stats.entries()).map(([brandId, s]) => {
      const appearanceRate = s.appearances / s.totalResponses;
      const avgRank = s.rankCount > 0 ? s.rankSum / s.rankCount : 0;
      const avgRankScore = s.rankCount > 0 ? 100 * Math.exp(-0.15 * (avgRank - 1)) : 0;
      const w = SCORE_WEIGHTS.engine;
      const score = w.appearance * appearanceRate * 100 + w.avgRank * avgRankScore;
      return { brandId, score, appearanceRate, avgRank };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.appearanceRate !== a.appearanceRate) return b.appearanceRate - a.appearanceRate;
      return a.avgRank - b.avgRank;
    });

    const top = scored.slice(0, TOP_N);
    for (let i = 0; i < top.length; i++) {
      await prisma.snapshot.create({
        data: {
          week,
          category,
          engine,
          brandId: top[i].brandId,
          score: Math.round(top[i].score * 100) / 100,
          appearanceRate: Math.round(top[i].appearanceRate * 10000) / 10000,
          avgRank: Math.round(top[i].avgRank * 100) / 100,
          rank: i + 1,
        },
      });
    }
  }

  if (!canPublishOverall(scoringEngines)) return;

  const responses = await prisma.response.findMany({
    where: { week, category, status: "ok", engine: { in: [...scoringEngines] } },
    select: { id: true, engine: true },
  });
  const responseIds = responses.map((r) => r.id);

  const mentions = await prisma.resolvedMention.findMany({
    where: { responseId: { in: responseIds }, brandId: { in: [...rankableIds] } },
  });

  const stats = new Map<string, BrandStats>();

  for (const m of mentions) {
    let s = stats.get(m.brandId);
    if (!s) {
      s = { brandId: m.brandId, appearances: 0, totalResponses: responseIds.length, rankSum: 0, rankCount: 0, engines: new Set() };
      stats.set(m.brandId, s);
    }
    s.rankSum += m.position;
    s.rankCount++;
  }

  const seenBrands = new Map<string, Set<string>>();
  for (const m of mentions) {
    if (!seenBrands.has(m.brandId)) seenBrands.set(m.brandId, new Set());
    seenBrands.get(m.brandId)!.add(m.responseId);
  }
  for (const [brandId, responseSet] of seenBrands) {
    stats.get(brandId)!.appearances = responseSet.size;
  }

  const scoringEngineSet = new Set(scoringEngines);
  const responseEngineMap = new Map(responses.map((r) => [r.id, r.engine]));
  for (const m of mentions) {
    const engine = responseEngineMap.get(m.responseId);
    if (engine && scoringEngineSet.has(engine)) stats.get(m.brandId)!.engines.add(engine);
  }

  const scored = Array.from(stats.values()).map((s) => {
    const appearanceRate = s.appearances / s.totalResponses;
    const avgRank = s.rankCount > 0 ? s.rankSum / s.rankCount : 0;
    const avgRankScore = s.rankCount > 0 ? 100 * Math.exp(-0.15 * (avgRank - 1)) : 0;
    const modelCoverage = modelCoverageScore(s.engines.size, scoringEngines.length);
    const w = SCORE_WEIGHTS.overall;
    const score =
      w.appearance * appearanceRate * 100 +
      w.avgRank * avgRankScore +
      w.modelCoverage * modelCoverage * 100;
    return { brandId: s.brandId, score, appearanceRate, avgRank, modelCoverage };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.appearanceRate !== a.appearanceRate) return b.appearanceRate - a.appearanceRate;
    return a.avgRank - b.avgRank;
  });

  const top = scored.slice(0, TOP_N);
  for (let i = 0; i < top.length; i++) {
    await prisma.snapshot.create({
      data: {
        week,
        category,
        engine: null,
        brandId: top[i].brandId,
        score: Math.round(top[i].score * 100) / 100,
        appearanceRate: Math.round(top[i].appearanceRate * 10000) / 10000,
        avgRank: Math.round(top[i].avgRank * 100) / 100,
        modelCoverage: Math.round(top[i].modelCoverage * 10000) / 10000,
        rank: i + 1,
      },
    });
  }
}

export async function scoreAll(week: string, options?: { force?: boolean }) {
  const { CATEGORIES } = await import("@/lib/constants");
  for (const cat of CATEGORIES) {
    await scoreCategory(week, cat, options);
  }
}
