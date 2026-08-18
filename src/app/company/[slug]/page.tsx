import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CompanyPageContent } from "@/components/company-page-content";
import {
  emptyCompanyPageData,
  getCompanyIndex,
  getCompanyLastSeen,
  getCompanyPage,
} from "@/lib/company-page";
import { getPublishedLeaderboardWeeks } from "@/lib/published-leaderboard";
import { getSiteUrl, stringifyJsonLd } from "@/lib/seo";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
};

/** Valid `from=/brand/{slug}` → brand slug for product pin. */
function brandSlugFromFromParam(from?: string): string | null {
  if (!from) return null;
  try {
    const target = new URL(from, "http://localhost");
    const parts = target.pathname.split("/").filter(Boolean);
    if (parts.length !== 2 || parts[0] !== "brand") return null;
    const brandSlug = parts[1]!;
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(brandSlug) ? brandSlug : null;
  } catch {
    return null;
  }
}

/** Safe back targets: brand or category pages only (open-redirect guard). */
function getValidCompanyBackTarget(from?: string): URL | null {
  if (!from) return null;
  try {
    const target = new URL(from, "http://localhost");
    const parts = target.pathname.split("/").filter(Boolean);
    if (parts.length !== 2) return null;
    if (parts[0] !== "brand" && parts[0] !== "category") return null;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(parts[1]!)) return null;
    return target;
  } catch {
    return null;
  }
}

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

export default async function CompanyPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { from } = await searchParams;
  const fromBrandSlug = brandSlugFromFromParam(from);
  const backTarget = getValidCompanyBackTarget(from);
  const backCategorySlug =
    backTarget?.pathname.startsWith("/category/") ? (backTarget.pathname.split("/")[2] ?? null) : null;
  const backHref = backTarget ? `${backTarget.pathname}${backTarget.search}` : "/rankings";
  const data = await getCompanyPage(slug);
  if (!data) {
    const [index, weeks] = await Promise.all([getCompanyIndex(), getPublishedLeaderboardWeeks()]);
    if (!index[slug]) notFound();
    const lastSeen = await getCompanyLastSeen(slug);
    return (
      <main className="mx-auto max-w-6xl px-6 pt-4 pb-10 sm:pt-5 sm:pb-14">
        <CompanyPageContent
          data={emptyCompanyPageData(slug, index[slug]!.name, weeks[0] ?? "", lastSeen)}
          fromBrandSlug={fromBrandSlug}
          backHref={backHref}
          backCategorySlug={backCategorySlug}
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
      <CompanyPageContent
        data={data}
        fromBrandSlug={fromBrandSlug}
        backHref={backHref}
        backCategorySlug={backCategorySlug}
      />
    </main>
  );
}
