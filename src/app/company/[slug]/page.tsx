import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompanyPageContent } from "@/components/company-page-content";
import { getCompanyIndex, getCompanyPage } from "@/lib/company-page";
import { SCORING_VERSION } from "@/lib/constants";
import { getPublishedLeaderboardWeeks } from "@/lib/published-leaderboard";
import { getSiteUrl, stringifyJsonLd } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCompanyPage(slug);
  const name = data?.name ?? (await getCompanyIndex())[slug]?.name;
  if (!name) {
    return { title: "Company not found", robots: { index: false, follow: false } };
  }
  const title = `${name} — Company`;
  const description = `Products under ${name} and their AI visibility rankings by category.`;
  return {
    title,
    description,
    robots: { index: false, follow: true },
    alternates: { canonical: `/company/${slug}` },
    openGraph: {
      title: `${title} | GEO Radar`,
      description,
      url: `/company/${slug}`,
      siteName: "GEO Radar",
      type: "website",
      images: [{ url: "/og-image.png", alt: "GEO Radar" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | GEO Radar`,
      description,
      images: ["/og-image.png"],
    },
  };
}

export default async function CompanyPage({ params }: Props) {
  const { slug } = await params;
  const data = await getCompanyPage(slug);
  if (!data) {
    const [index, weeks] = await Promise.all([getCompanyIndex(), getPublishedLeaderboardWeeks()]);
    if (!index[slug]) notFound();
    return (
      <main className="mx-auto max-w-6xl px-6 pt-4 pb-10 sm:pt-5 sm:pb-14">
        <CompanyPageContent
          data={{
            schemaVersion: 1,
            scoringVersion: SCORING_VERSION,
            week: weeks[0] ?? "",
            slug,
            name: index[slug]!.name,
            updatedAt: new Date().toISOString().split("T")[0]!,
            products: [],
          }}
        />
      </main>
    );
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: getSiteUrl() },
      {
        "@type": "ListItem",
        position: 2,
        name: data.name,
        item: `${getSiteUrl()}/company/${slug}`,
      },
    ],
  };

  return (
    <main className="mx-auto max-w-6xl px-6 pt-4 pb-10 sm:pt-5 sm:pb-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(breadcrumbJsonLd) }}
      />
      <CompanyPageContent data={data} />
    </main>
  );
}
