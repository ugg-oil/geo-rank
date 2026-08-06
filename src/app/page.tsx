import type { Metadata } from "next";
import { HomeContent } from "@/components/home-content";
import { getBiggestMovers } from "@/lib/biggest-movers";
import {
  COLLECTION_ENGINES,
  formatEngineList,
  weeklyPromptCount,
} from "@/lib/constants";
import { getPublishedLeaderboardManifest } from "@/lib/published-leaderboard";
import { SITE_URL, stringifyJsonLd } from "@/lib/seo";

const ENGINE_COPY = formatEngineList();

export const metadata: Metadata = {
  title: {
    absolute: "Which Products Does AI Recommend? | GEO Radar",
  },
  description:
    `See the Top 20 products showing up in ${ENGINE_COPY} answers. Weekly AI visibility rankings, updated every Monday.`,
  keywords: [
    "AI visibility",
    "AI visibility rankings",
    "AI product rankings",
    "GEO rankings",
    "ChatGPT product recommendations",
    "Gemini product recommendations",
    "Grok product recommendations",
    "Perplexity product recommendations",
    "Claude product recommendations",
    "DeepSeek product recommendations",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Which Products Does AI Recommend? | GEO Radar",
    description:
      `See the Top 20 products showing up in ${ENGINE_COPY} answers. Weekly AI visibility rankings, updated every Monday.`,
    url: "/",
    type: "website",
    images: [{ url: "/og-image.png", alt: "GEO Radar" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Which Products Does AI Recommend? | GEO Radar",
    description:
      `See the Top 20 products showing up in ${ENGINE_COPY} answers. Weekly AI visibility rankings, updated every Monday.`,
    images: ["/og-image.png"],
  },
};

export default async function Home() {
  const [manifest, movers] = await Promise.all([
    getPublishedLeaderboardManifest(),
    getBiggestMovers(5),
  ]);
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GEO Radar",
    url: SITE_URL,
    description:
      `See which products ${ENGINE_COPY} recommend. Weekly Top 20 AI visibility rankings.`,
  };
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "GEO Radar",
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
  };

  return (
    <main className="relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(organizationJsonLd) }}
      />
      <HomeContent
        publishedAt={manifest?.publishedAt ?? null}
        scoringEngineCount={manifest?.scoringEngineUnion?.length ?? COLLECTION_ENGINES.length}
        promptCount={manifest?.promptCount ?? weeklyPromptCount()}
        movers={movers}
      />
    </main>
  );
}
