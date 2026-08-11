/**
 * P5 category backfill: generate prior periods with prompt suffix ` as of YYYY-MM-DD`.
 *
 * Dry-run (default):
 *   npm run backfill:categories
 *   npm run backfill:categories -- --periods=4 "VPN Services"
 *
 * Execute (API cost — 8 cats × 4 periods × 6 engines × 8 prompts ≈ 1.5k requests):
 *   npm run backfill:categories -- --execute --all-new
 *
 * Does not update latest unless --publish-latest is passed after all periods succeed.
 * Prefer publishing historical periods with updateLatest=false, then one final publish of
 * the current period (or a dedicated publish) to fold new boards into latest.
 */
import { config } from "dotenv";
const baseEnv = config({ path: ".env" }).parsed;
config({ path: ".env.local" });
if ((process.env.OPENROUTER_API_KEY?.length ?? 0) < 40 && baseEnv?.OPENROUTER_API_KEY) {
  process.env.OPENROUTER_API_KEY = baseEnv.OPENROUTER_API_KEY;
}

import { BACKFILL_DATA_SOURCE, getDefaultBackfillPeriodKeys } from "@/lib/backfill";
import { getCategoryPeriodDays } from "@/lib/category-period";
import { CATEGORIES, COLLECTION_ENGINES, PROMPTS_PER_CATEGORY } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { P5_CATEGORIES } from "@/lib/p5-categories";
import { backfillPromptSuffix } from "@/lib/period";
import { collectEngine } from "@/pipeline/collect";
import { extractWeek } from "@/pipeline/extract";
import { normalizeWeek } from "@/pipeline/normalize";
import { consolidateBrands } from "@/pipeline/consolidate";
import { classifyAllBrands } from "@/pipeline/classify-entities";
import { scoreCategory } from "@/pipeline/score";
import { publishLeaderboards } from "@/pipeline/publish";
import {
  PIPELINE_COLLECTION_TIMEOUT_MS,
} from "@/lib/pipeline-timeouts";

const execute = process.argv.includes("--execute");
const publishLatest = process.argv.includes("--publish-latest");
const allNew = process.argv.includes("--all-new");
const periodsArg = process.argv.find((arg) => arg.startsWith("--periods="));
const periodCount = periodsArg ? Number(periodsArg.split("=")[1]) : 4;

const named = process.argv
  .slice(2)
  .filter((arg) => !arg.startsWith("--") && arg.length > 0);

function resolveCategories(): string[] {
  if (allNew) return [...P5_CATEGORIES];
  if (named.length === 0) return [...P5_CATEGORIES];
  const unknown = named.filter((name) => !(CATEGORIES as readonly string[]).includes(name));
  if (unknown.length) {
    throw new Error(`Unknown categories: ${unknown.join(", ")}`);
  }
  return named;
}

async function runCategoryPeriod(category: string, week: string) {
  const suffix = backfillPromptSuffix(week);
  const options = {
    categories: [category],
    promptSuffix: suffix,
    forceCategories: true,
  } as const;

  for (const engine of COLLECTION_ENGINES) {
    const deadline = Date.now() + PIPELINE_COLLECTION_TIMEOUT_MS;
    console.log(`[BackfillCat] collect ${engine} / ${category} / ${week}${suffix}`);
    await collectEngine(week, engine, deadline, options);
  }

  await extractWeek(week);
  await normalizeWeek(week);
  await consolidateBrands();
  await classifyAllBrands();
  await scoreCategory(week, category, { force: true });

  const snapshotCount = await prisma.snapshot.count({ where: { week, category } });
  if (snapshotCount === 0) {
    throw new Error(`Backfill produced zero snapshots for ${category} / ${week}`);
  }

  await publishLeaderboards(week, { updateLatest: false });
  return snapshotCount;
}

async function main() {
  if (!Number.isFinite(periodCount) || periodCount < 1) {
    throw new Error("--periods must be a positive number");
  }

  const categories = resolveCategories();
  const plan = categories.map((category) => {
    const periodDays = getCategoryPeriodDays(category);
    const periods = getDefaultBackfillPeriodKeys(periodDays, periodCount);
    return {
      category,
      periodDays,
      periods,
      estimatedRequests:
        periods.length * COLLECTION_ENGINES.length * PROMPTS_PER_CATEGORY,
    };
  });

  const totalRequests = plan.reduce((sum, row) => sum + row.estimatedRequests, 0);

  console.log(
    JSON.stringify(
      {
        dataSource: BACKFILL_DATA_SOURCE,
        execute,
        publishLatest,
        periodCount,
        categories,
        totalEstimatedRequests: totalRequests,
        plan,
        note: "FE must not disclose pseudo-history; treat as normal published periods.",
      },
      null,
      2
    )
  );

  if (!execute) {
    console.log("Dry run only. Re-run with --execute to collect/score/publish (expensive).");
    return;
  }

  for (const row of plan) {
    for (const week of row.periods) {
      const existing = await prisma.snapshot.count({
        where: { week, category: row.category },
      });
      if (existing > 0) {
        console.log(
          `[BackfillCat] skip ${row.category} / ${week} (already has ${existing} snapshots)`
        );
        await publishLeaderboards(week, { updateLatest: false });
        continue;
      }
      const snapshots = await runCategoryPeriod(row.category, week);
      console.log(
        JSON.stringify({
          category: row.category,
          week,
          snapshots,
          status: BACKFILL_DATA_SOURCE,
        })
      );
    }
  }

  if (publishLatest) {
    console.log("[BackfillCat] Publishing latest merge from most recent backfilled periods…");
    // Publish each category's newest backfilled period into latest (merge-safe).
    const newestByWeek = new Map<string, string[]>();
    for (const row of plan) {
      const newest = row.periods[row.periods.length - 1];
      if (!newest) continue;
      const list = newestByWeek.get(newest) ?? [];
      list.push(row.category);
      newestByWeek.set(newest, list);
    }
    for (const week of [...newestByWeek.keys()].sort()) {
      await publishLeaderboards(week, { updateLatest: true });
    }
  }

  console.log("[BackfillCat] Done.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
