/**
 * P5 launch gate: ≥30 valid candidates, ≥3 engines OK, Top 20 no out-of-scope excludes.
 *
 * Usage:
 *   npm run pipeline:launch-gate -- "Week of YYYY-MM-DD" "VPN Services"
 *   npm run pipeline:launch-gate -- --all-new "Week of YYYY-MM-DD"
 */
import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local" });

import { P5_CATEGORIES } from "@/lib/p5-categories";
import { prisma } from "@/lib/db";
import {
  COLLECTION_ENGINES,
  MIN_SCORING_ENGINES_FOR_OVERALL,
  PROMPTS_PER_CATEGORY,
  TOP_N,
} from "@/lib/constants";
import { isExcludedFromCategory } from "@/lib/entity-audit";
import { toStoragePeriodKey } from "@/lib/period";

const MIN_VALID_CANDIDATES = 30;

const allNew = process.argv.includes("--all-new");
const args = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));

function usage(): never {
  throw new Error(
    'Usage: npm run pipeline:launch-gate -- "Week of YYYY-MM-DD" "Category"\n' +
      '   or: npm run pipeline:launch-gate -- --all-new "Week of YYYY-MM-DD"'
  );
}

async function assessCategory(week: string, category: string) {
  const promptCount = await prisma.prompt.count({ where: { category, active: true } });
  const expectedPrompts = promptCount || PROMPTS_PER_CATEGORY;

  const okByEngine = await prisma.response.groupBy({
    by: ["engine"],
    where: { week, category, status: "ok" },
    _count: { id: true },
  });
  const enginesOk = okByEngine
    .filter((row) => row._count.id >= expectedPrompts)
    .map((row) => row.engine);

  const okResponses = await prisma.response.findMany({
    where: { week, category, status: "ok" },
    select: { id: true },
  });
  const responseIds = okResponses.map((row) => row.id);

  const mentions =
    responseIds.length === 0
      ? []
      : await prisma.resolvedMention.findMany({
          where: { responseId: { in: responseIds } },
          select: { brandId: true, brand: { select: { canonicalName: true } } },
          distinct: ["brandId"],
        });

  const validCandidates = mentions.filter(
    (row) => !isExcludedFromCategory(row.brand.canonicalName, category)
  );

  const top20 = await prisma.snapshot.findMany({
    where: { week, category, engine: null, rank: { lte: TOP_N } },
    orderBy: { rank: "asc" },
    include: { brand: { select: { canonicalName: true } } },
  });

  const outOfScope = top20.filter((row) =>
    isExcludedFromCategory(row.brand.canonicalName, category)
  );

  const ok =
    validCandidates.length >= MIN_VALID_CANDIDATES &&
    enginesOk.length >= MIN_SCORING_ENGINES_FOR_OVERALL &&
    outOfScope.length === 0 &&
    top20.length > 0;

  return {
    category,
    week,
    ok,
    validCandidates: validCandidates.length,
    minValidCandidates: MIN_VALID_CANDIDATES,
    enginesOk: enginesOk.length,
    enginesOkList: enginesOk,
    minEngines: MIN_SCORING_ENGINES_FOR_OVERALL,
    collectionEngines: COLLECTION_ENGINES.length,
    top20Count: top20.length,
    outOfScopeTop20: outOfScope.map((row) => ({
      rank: row.rank,
      name: row.brand.canonicalName,
    })),
    gates: {
      candidates: validCandidates.length >= MIN_VALID_CANDIDATES,
      engines: enginesOk.length >= MIN_SCORING_ENGINES_FOR_OVERALL,
      noOutOfScope: outOfScope.length === 0,
      hasTop20: top20.length > 0,
    },
  };
}

async function main() {
  if (args.length < 1) usage();
  const weekRaw = args[0]!;
  const week = weekRaw.startsWith("Week of ") ? weekRaw : toStoragePeriodKey(weekRaw);
  const categories = allNew
    ? [...P5_CATEGORIES]
    : args.slice(1).length
      ? args.slice(1)
      : usage();

  const results = [];
  for (const category of categories) {
    results.push(await assessCategory(week, category));
  }

  const summary = {
    week,
    allOk: results.every((row) => row.ok),
    results,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.allOk) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
