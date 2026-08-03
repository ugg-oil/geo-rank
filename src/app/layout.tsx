import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ThemeScript } from "@/components/theme-script";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Which Products Does AI Recommend? | GEO Radar",
    template: "%s | GEO Radar",
  },
  description:
    "See the Top 20 products showing up in ChatGPT, Gemini, and Grok answers. Weekly AI visibility rankings, updated every Monday.",
  keywords: [
    "AI visibility",
    "AI visibility rankings",
    "GEO rankings",
    "generative engine optimization",
    "ChatGPT rankings",
    "Gemini rankings",
    "Grok rankings",
  ],
  openGraph: {
    title: "Which Products Does AI Recommend? | GEO Radar",
    description:
      "See the Top 20 products showing up in ChatGPT, Gemini, and Grok answers. Weekly AI visibility rankings, updated every Monday.",
    url: "/",
    siteName: "GEO Radar",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        alt: "GEO Radar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Which Products Does AI Recommend? | GEO Radar",
    description:
      "See the Top 20 products showing up in ChatGPT, Gemini, and Grok answers. Weekly AI visibility rankings, updated every Monday.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen antialiased flex flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
