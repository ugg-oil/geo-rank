import type { Metadata } from "next";
import { HomeContent } from "@/components/home-content";
import { getBiggestMovers } from "@/lib/biggest-movers";
import {
  COLLECTION_ENGINES,
  weeklyPromptCount,
} from "@/lib/constants";
import { getPublishedLeaderboardManifest } from "@/lib/published-leaderboard";
import { SITE_URL, stringifyJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: "Which Products Does AI Recommend? | GEO Radar",
  },
  description:
    "See how often leading AI engines mention your brand — and how that rank trends week over week — so you can improve GEO.",
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
      "See how often leading AI engines mention your brand — and how that rank trends week over week — so you can improve GEO.",
    url: "/",
    type: "website",
    images: [{ url: "/og-image.png", alt: "GEO Radar" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Which Products Does AI Recommend? | GEO Radar",
    description:
      "See how often leading AI engines mention your brand — and how that rank trends week over week — so you can improve GEO.",
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
      "See how often leading AI engines mention your brand — and how that rank trends week over week — so you can improve GEO.",
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
        scoringEngineCount={manifest?.scoringEngineUnion?.length ?? COLLECTION_ENGINES.length}
        promptCount={manifest?.promptCount ?? weeklyPromptCount()}
        movers={movers}
      />
    </main>
  );
}
