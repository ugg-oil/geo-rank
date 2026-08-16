import { buildAlsoMentioned } from "@/lib/also-mentioned";
import { AlsoMentionedTable } from "@/components/also-mentioned-table";
import { normalizePeriodDate } from "@/lib/period";

export async function AlsoMentionedSection({
  category,
  week,
  top20BrandIds,
  sourcePath,
}: {
  category: string;
  week: string;
  top20BrandIds: string[];
  sourcePath: string;
}) {
  const rows = await buildAlsoMentioned(category, week, new Set(top20BrandIds));
  return (
    <AlsoMentionedTable
      rows={rows}
      sourcePath={sourcePath}
      periodStart={normalizePeriodDate(week)}
    />
  );
}
