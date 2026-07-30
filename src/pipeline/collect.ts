import { prisma } from "@/lib/db";
import { getOpenRouter } from "@/lib/openrouter";
import { ENGINES, ENGINE_MODEL_SLUGS } from "@/lib/constants";
import { getCurrentWeek } from "@/lib/week";

export async function collectCategory(category: string, week?: string) {
  const w = week ?? getCurrentWeek();
  const prompts = await prisma.prompt.findMany({
    where: { category, active: true },
  });

  const results: string[] = [];

  for (const engine of ENGINES) {
    for (const prompt of prompts) {
      const existing = await prisma.response.findFirst({
        where: { week: w, engine, promptId: prompt.id },
      });
      if (existing) continue;

      try {
        const completion = await getOpenRouter().chat.completions.create({
          model: ENGINE_MODEL_SLUGS[engine],
          messages: [{ role: "user", content: prompt.promptText }],
          temperature: 0.7,
        });

        const rawText = completion.choices[0]?.message?.content ?? "";
        const tokenCost =
          ((completion.usage?.prompt_tokens ?? 0) +
            (completion.usage?.completion_tokens ?? 0)) *
          0.00001;

        await prisma.response.create({
          data: {
            week: w,
            category,
            engine,
            modelSlug: ENGINE_MODEL_SLUGS[engine],
            promptId: prompt.id,
            rawText,
            status: rawText.trim() ? "ok" : "failed",
            tokenCost,
          },
        });

        results.push(`✓ ${engine} / ${prompt.id}`);
      } catch (err) {
        await prisma.response.create({
          data: {
            week: w,
            category,
            engine,
            modelSlug: ENGINE_MODEL_SLUGS[engine],
            promptId: prompt.id,
            rawText: null,
            status: "failed",
            tokenCost: null,
          },
        });
        results.push(`✗ ${engine} / ${prompt.id}: ${err}`);
      }
    }
  }

  return results;
}

export async function collectAll(week?: string) {
  const { CATEGORIES } = await import("@/lib/constants");
  const allResults: string[] = [];
  for (const cat of CATEGORIES) {
    const r = await collectCategory(cat, week);
    allResults.push(...r);
  }
  return allResults;
}
