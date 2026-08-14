import { loadBrandExcerptsForPage } from "@/lib/brand-page-build";
import { BrandEvidenceDetails } from "@/components/brand-evidence-details";

export async function BrandEvidenceSection({
  slug,
  week,
}: {
  slug: string;
  week: string;
}) {
  const groups = await loadBrandExcerptsForPage(week, slug);
  return <BrandEvidenceDetails groups={groups} week={week} />;
}
