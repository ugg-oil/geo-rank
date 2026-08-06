import { prisma } from "@/lib/db";
import { canRetryCategoryEngine } from "@/lib/engine-scoring";
import { MAX_CATEGORY_ENGINE_RETRIES } from "@/lib/constants";

export async function claimCategoryEngineRetry(
  week: string,
  category: string,
  engine: string,
  options: { override?: boolean } = {}
) {
  const existing = await prisma.collectionRetry.findUnique({
    where: { week_category_engine: { week, category, engine } },
  });
  const attempts = existing?.attempts ?? 0;
  if (!canRetryCategoryEngine(attempts, options)) {
    throw new Error(
      `Retry cap reached (${MAX_CATEGORY_ENGINE_RETRIES}) for ${week} / ${category} / ${engine}. Set RETRY_OVERRIDE=1 to force.`
    );
  }

  const row = await prisma.collectionRetry.upsert({
    where: { week_category_engine: { week, category, engine } },
    create: { week, category, engine, attempts: 1 },
    update: { attempts: { increment: 1 } },
  });

  return row.attempts;
}
