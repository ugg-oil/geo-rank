import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { notFound } from "next/navigation";
import { BrandEvidenceSection } from "@/components/brand-evidence-section";
import { BrandPageContent } from "@/components/brand-page-content";
import { getBrandPageBundle } from "@/lib/brand-page";
import { getSiteUrl, stringifyJsonLd } from "@/lib/seo";
import { formatEngineList } from "@/lib/constants";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; week?: string }>;
};

function weekFromFromParam(from?: string): string | undefined {
  if (!from) return undefined;
  try {
    const target = new URL(from, "http://localhost");
    const value = target.searchParams.get("week");
    return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function getValidBrandBackTarget(from?: string): URL | null {
  if (!from) return null;
  try {
    const target = new URL(from, "http://localhost");
    if (!target.pathname.startsWith("/category/")) return null;
    if (target.pathname.split("/").filter(Boolean).length !== 2) return null;
    return target;
  } catch {
    return null;
  }
}

const getBundle = cache(async (slug: string, requestedWeek?: string) => {
  return getBrandPageBundle(slug, requestedWeek);
});

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { week, from } = await searchParams;
  const weekParam = week ?? weekFromFromParam(from);
  const bundle = await getBundle(slug, weekParam);
  const data = bundle?.data ?? null;
  if (!data) {
    return { title: "Brand not found", robots: { index: false, follow: false } };
  }
  return {
    title: `${data.name} — AI Visibility`,
    description: `See how ${data.name} ranks in AI visibility rankings across ${formatEngineList()}.`,
    robots: bundle?.layerB.layerB
      ? { index: true, follow: true }
      : { index: false, follow: true },
    alternates: { canonical: `/brand/${slug}` },
    openGraph: {
      title: `${data.name} — AI Visibility | GEO Radar`,
      description: `See how ${data.name} ranks in AI visibility rankings across ${formatEngineList()}.`,
      url: `/brand/${slug}`,
      siteName: "GEO Radar",
      type: "website",
      images: [{ url: "/og-image.png", alt: "GEO Radar" }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${data.name} — AI Visibility | GEO Radar`,
      description: `See how ${data.name} ranks in AI visibility rankings across ${formatEngineList()}.`,
      images: ["/og-image.png"],
    },
  };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { from, week } = await searchParams;
  const weekParam = week ?? weekFromFromParam(from);
  const bundle = await getBundle(slug, weekParam);
  if (!bundle) notFound();
  const { data, histories, similarByCategory } = bundle;

  const historyByCategory = Object.fromEntries(
    histories.map((entry) => [entry.categorySlug, entry.points])
  );

  const backTarget = getValidBrandBackTarget(from);
  const backCategorySlug = backTarget?.pathname.split("/")[2] ?? null;
  const backHref = backTarget
    ? `${backTarget.pathname}${backTarget.search}`
    : "/rankings";

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: getSiteUrl() },
      { "@type": "ListItem", position: 2, name: data.name, item: `${getSiteUrl()}/brand/${slug}` },
    ],
  };

  return (
    <main className="mx-auto max-w-6xl px-6 pt-4 pb-10 sm:pt-5 sm:pb-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(breadcrumbJsonLd) }}
      />
      <BrandPageContent
        data={data}
        historyByCategory={historyByCategory}
        similarByCategory={similarByCategory}
        backHref={backHref}
        backCategorySlug={backCategorySlug}
        evidence={
          <Suspense key="brand-evidence" fallback={null}>
            <BrandEvidenceSection slug={slug} week={data.week} />
          </Suspense>
        }
      />
    </main>
  );
}
