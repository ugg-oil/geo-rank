import "dotenv/config";
import { getBrandCategoryHistories } from "@/lib/brand-history";
import { getBrandIndex, getPublishedBrandPage } from "@/lib/brand-page";
import { getPublishedLeaderboardWeeks } from "@/lib/published-leaderboard";

async function main() {
  const weeks = await getPublishedLeaderboardWeeks();
  console.log("weeks count:", weeks.length);
  console.log("weeks:", weeks);

  const index = await getBrandIndex();
  const slugs = Object.keys(index).slice(0, 5);
  console.log("sample slugs:", slugs);

  for (const slug of slugs) {
    const histories = await getBrandCategoryHistories(slug);
    console.log(`\n${slug}: ${histories.length} categories with history`);
    for (const history of histories) {
      console.log(`  ${history.categorySlug}: ${history.points.length} points`);
    }
    for (const week of weeks) {
      const page = await getPublishedBrandPage(slug, week);
      console.log(`  snapshot ${week}: ${page ? `${page.categories.length} cats` : "MISSING"}`);
    }
  }
}

main().catch(console.error);
