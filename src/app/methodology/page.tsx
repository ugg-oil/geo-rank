import type { Metadata } from "next";
import { MethodologyContent } from "@/components/methodology-content";
import { formatEngineList } from "@/lib/constants";

const ENGINE_COPY = formatEngineList();

export const metadata: Metadata = {
  title: "AI Visibility Methodology",
  description:
    `How GEO Radar measures AI visibility and scores weekly product rankings across ${ENGINE_COPY}.`,
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
