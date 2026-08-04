import { z } from "zod";
import { prisma } from "@/lib/db";
import { getOpenRouter } from "@/lib/openrouter";
import { EXTRACTION_MODEL, MAX_MENTIONS_PER_RESPONSE } from "@/lib/constants";
import {
  assertBeforeDeadline,
  PIPELINE_EXTRACTION_TIMEOUT_MS,
} from "@/lib/pipeline-timeouts";

const MentionSchema = z.object({
  raw_brand: z.string(),
  position: z.number().int().positive(),
});

const MentionsSchema = z.object({
  mentions: z.array(MentionSchema),
});

const EXTRACTION_PROMPT = `You are a brand/product extraction assistant. Given an AI response about product recommendations, extract all mentioned product or brand names and their order of appearance.

Rules:
- Only extract product/brand names, not generic terms like "AI tool" or "platform"
- Do NOT include the AI engine itself (e.g., don't extract "ChatGPT" if the response is from ChatGPT)
- Position starts at 1 for the first mentioned brand
- Maximum 30 mentions per response
- Return valid JSON only

Return format:
{"mentions": [{"raw_brand": "ProductName", "position": 1}]}`;

const EXTRACTION_CONCURRENCY = Math.max(
  1,
  Math.floor(Number(process.env.PIPELINE_EXTRACTION_CONCURRENCY) || 4)
);

export async function extractResponse(responseId: string) {
  const response = await prisma.response.findUnique({
    where: { id: responseId },
  });
  if (!response || response.status !== "ok" || !response.rawText) return [];

  const existing = await prisma.extractedMention.findFirst({
    where: { responseId },
  });
  if (existing) return [];

  try {
    const completion = await getOpenRouter().chat.completions.create({
      model: EXTRACTION_MODEL,
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        {
          role: "user",
          content: `AI engine: ${response.engine}\n\nResponse:\n${response.rawText}`,
        },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = MentionsSchema.parse(JSON.parse(raw));
    const mentions = parsed.mentions.slice(0, MAX_MENTIONS_PER_RESPONSE);
    if (parsed.mentions.length > MAX_MENTIONS_PER_RESPONSE) {
      console.warn(
        `Extraction mentions truncated for response ${responseId}: ${parsed.mentions.length} -> ${MAX_MENTIONS_PER_RESPONSE}`
      );
    }

    const created = await Promise.all(
      mentions.map((m) =>
        prisma.extractedMention.create({
          data: {
            responseId,
            rawBrand: m.raw_brand,
            position: m.position,
          },
        })
      )
    );

    return created;
  } catch (err) {
    console.error(`Extraction failed for response ${responseId}:`, err);
    return [];
  }
}

export async function extractWeek(week: string) {
  const responses = await prisma.response.findMany({
    where: { week, status: "ok" },
    select: { id: true },
  });

  const deadline = Date.now() + PIPELINE_EXTRACTION_TIMEOUT_MS;
  let cursor = 0;
  let count = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= responses.length) return;
      assertBeforeDeadline("extraction", deadline, PIPELINE_EXTRACTION_TIMEOUT_MS);
      const mentions = await extractResponse(responses[index].id);
      count += mentions.length;
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(EXTRACTION_CONCURRENCY, responses.length) },
      () => worker()
    )
  );
  return count;
}
