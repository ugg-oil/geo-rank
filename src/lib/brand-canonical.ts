import { normalizeBrandKey } from "@/lib/brand-keys";
const RAW_PREFERRED: Record<string, string> = {
  // Google / Gemini
  "google bard": "Gemini",
  "google gemini": "Gemini",
  bard: "Gemini",
  "google gemini / imagen": "Gemini",
  imagen: "Gemini",
  veo: "Gemini",
  "google workspace ai": "Google Workspace",

  // OpenAI / ChatGPT product variants.
  // Keep the company name "OpenAI" separate for entity/visibility analysis.
  "openai's gpt": "ChatGPT",
  "openai's chatgpt": "ChatGPT",
  "openai chatgpt": "ChatGPT",
  "evolved chatgpt": "ChatGPT",
  "gpt-4": "ChatGPT",
  "gpt 4": "ChatGPT",
  "gpt-4o": "ChatGPT",
  "gpt-5": "ChatGPT",
  "chat gpt": "ChatGPT",
  "chatgpt advanced data analysis": "ChatGPT",

  // Anthropic / Claude product variants.
  // Keep the company name "Anthropic" separate.
  "claude ai": "Claude",
  "claude 3": "Claude",
  "anthropic's claude": "Claude",

  // Microsoft Copilot (no bare "copilot")
  "microsoft copilot": "Microsoft Copilot",
  "microsoft 365 copilot": "Microsoft Copilot",

  // Products
  "jasper ai": "Jasper",
  "notion ai": "Notion",
  "github copilot": "GitHub Copilot",
  "copy ai": "Copy",
  copy: "Copy",
  "midjourney ai": "Midjourney",
  "mid journey": "Midjourney",
  "bing image creator": "Microsoft Designer",
  "dall-e 2": "DALL·E",
  "dall-e 3": "DALL·E",
  "dall-e": "DALL·E",
  "dall e": "DALL·E",
  "gmail smart compose": "Gmail Smart Compose",
  "enhanced asana": "Asana",
  teams: "Microsoft Teams",
  azure: "Microsoft Azure",
  "hubspot crm": "HubSpot",
  "perplexity ai": "Perplexity",
  "einstein ai": "Salesforce",

  // AI Image / Video
  "stability ai's stable diffusion": "Stable Diffusion",
  "adobe's firefly": "Adobe Firefly",
  "runwayml's gen-2": "Runway",
  "runway gen-2": "Runway",
  runwayml: "Runway",
};

export const PREFERRED_CANONICAL: Record<string, string> = Object.fromEntries(
  Object.entries(RAW_PREFERRED).map(([k, v]) => [normalizeBrandKey(k), v])
);

export function preferredCanonicalName(name: string): string {
  return PREFERRED_CANONICAL[normalizeBrandKey(name)] ?? name;
}

export { normalizeBrandKey } from "@/lib/brand-keys";
