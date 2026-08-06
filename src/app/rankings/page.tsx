import type { Metadata } from "next";
import { RankingsContent } from "@/components/rankings-content";
import { CATEGORY_CARDS } from "@/lib/category-cards";
import type { CategorySlug } from "@/lib/i18n/messages";
import {
  getPublishedCategoryLeaderboards,
  getPublishedLeaderboardManifest,
} from "@/lib/published-leaderboard";

export const metadata: Metadata = {
  title: "AI Visibility Rankings",
  description:
    "Browse weekly Top 20 AI visibility rankings across AI Tools, SaaS, creative, developer, and marketing categories.",
  alternates: {
    canonical: "/rankings",
  },
  openGraph: {
    title: "AI Visibility Rankings | GEO Radar",
    description:
      "Browse weekly Top 20 AI visibility rankings across AI Tools, SaaS, creative, developer, and marketing categories.",
    url: "/rankings",
    type: "website",
    images: [{ url: "/og-image.png", alt: "GEO Radar" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Visibility Rankings | GEO Radar",
    description:
      "Browse weekly Top 20 AI visibility rankings across AI Tools, SaaS, creative, developer, and marketing categories.",
    images: ["/og-image.png"],
  },
};

export default async function RankingsPage() {
  const [manifest, ...boards] = await Promise.all([
    getPublishedLeaderboardManifest(),
    ...CATEGORY_CARDS.map((cat) => getPublishedCategoryLeaderboards(cat.slug)),
  ]);

  const week = manifest?.week ?? boards.find(Boolean)?.week ?? null;
  const cards = CATEGORY_CARDS.map((cat, index) => ({
    slug: cat.slug as CategorySlug,
    leader: boards[index]?.boards.overall.snapshots[0]
      ? { brandName: boards[index]!.boards.overall.snapshots[0]!.brandName }
      : null,
  }));

  return (
    <main className="relative overflow-hidden">
      <RankingsContent
        publishedAt={manifest?.publishedAt ?? null}
        week={week}
        cards={cards}
      />
    </main>
  );
}
