import type { Metadata } from "next";
import { MethodologyContent } from "@/components/methodology-content";

export const metadata: Metadata = {
  title: "AI Visibility Methodology",
  description:
    "Helps brands see mention frequency and rank trends in leading AI recommendations — so they can improve GEO. How we collect, score, and publish weekly rankings.",
  keywords: [
    "AI visibility methodology",
    "GEO methodology",
    "generative engine optimization",
    "AI product ranking methodology",
  ],
  alternates: {
    canonical: "/methodology",
  },
};

export default function MethodologyPage() {
  return <MethodologyContent />;
}
