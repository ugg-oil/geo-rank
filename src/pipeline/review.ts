import { prisma } from "@/lib/db";
import * as fs from "fs";
import * as path from "path";

interface ReviewItem {
  raw_brand: string;
  count: number;
  sample?: string;
  suggestion?: string;
}

export interface ReviewAction {
  raw_brand: string;
  action: "merge" | "new" | "ignore";
  target?: string;
}

export async function applyReviewActions(actions: ReviewAction[]) {
  let processed = 0;

  for (const action of actions) {
    const queueItem = await prisma.brandReviewQueue.findFirst({
      where: { rawBrand: action.raw_brand, status: "pending" },
    });

    if (!queueItem) continue;

    switch (action.action) {
      case "merge": {
        if (!action.target) break;
        const targetBrand = await prisma.brand.findFirst({
          where: { canonicalName: action.target },
        });
        if (!targetBrand) break;

        const existingAlias = await prisma.brandAlias.findFirst({
          where: {
            alias: { equals: action.raw_brand, mode: "insensitive" },
          },
        });
        if (!existingAlias) {
          try {
            await prisma.brandAlias.create({
              data: {
                brandId: targetBrand.id,
                alias: action.raw_brand,
                source: "review_queue",
              },
            });
          } catch (err) {
            const code =
              typeof err === "object" &&
              err !== null &&
              "code" in err &&
              (err as { code?: string }).code;
            if (code !== "P2002") throw err;
          }
        }

        const oldBrand = await prisma.brand.findFirst({
          where: { canonicalName: action.raw_brand },
        });
        if (oldBrand && oldBrand.id !== targetBrand.id) {
          await prisma.resolvedMention.updateMany({
            where: { brandId: oldBrand.id },
            data: { brandId: targetBrand.id },
          });
        }

        await prisma.brandReviewQueue.update({
          where: { id: queueItem.id },
          data: { status: "merged" },
        });
        processed++;
        break;
      }
      case "new":
        await prisma.brandReviewQueue.update({
          where: { id: queueItem.id },
          data: { status: "new" },
        });
        processed++;
        break;
      case "ignore":
        await prisma.ignoredTerm.upsert({
          where: { term: action.raw_brand },
          create: { term: action.raw_brand },
          update: {},
        });
        await prisma.brandReviewQueue.update({
          where: { id: queueItem.id },
          data: { status: "ignored" },
        });
        processed++;
        break;
    }
  }

  return processed;
}

export async function exportReview(week: string) {
  const items = await prisma.brandReviewQueue.findMany({
    where: { week, status: "pending" },
    orderBy: { count: "desc" },
  });

  const output: ReviewItem[] = [];

  for (const item of items) {
    let sample: string | undefined;
    if (item.sampleResponseId) {
      const resp = await prisma.response.findUnique({
        where: { id: item.sampleResponseId },
      });
      sample = resp?.rawText?.slice(0, 200);
    }

    output.push({
      raw_brand: item.rawBrand,
      count: item.count,
      sample,
    });
  }

  const outDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "review.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Exported ${output.length} items to ${outPath}`);
  return output;
}

export async function importReview(filePath?: string) {
  const fp = filePath ?? path.join(process.cwd(), "data", "review.json");
  const raw = fs.readFileSync(fp, "utf-8");
  const actions: ReviewAction[] = JSON.parse(raw);
  const processed = await applyReviewActions(actions);
  console.log(`Processed ${processed} review actions`);
  return processed;
}
