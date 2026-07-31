import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ThemeScript } from "@/components/theme-script";
import { SITE_URL } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AI Visibility Rankings | GEO Radar",
    template: "%s | GEO Radar",
  },
  description:
    "Weekly AI visibility rankings showing which products are recommended by ChatGPT, Gemini, and Grok.",
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
    title: "AI Visibility Rankings | GEO Radar",
    description:
      "Weekly AI visibility rankings showing which products are recommended by ChatGPT, Gemini, and Grok.",
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
    title: "AI Visibility Rankings | GEO Radar",
    description:
      "Weekly AI visibility rankings showing which products are recommended by ChatGPT, Gemini, and Grok.",
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
