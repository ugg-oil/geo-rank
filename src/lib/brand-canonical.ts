import { normalizeBrandKey } from "@/lib/brand-keys";
const RAW_PREFERRED: Record<string, string> = {
  // Google / Gemini
  "google bard": "Gemini",
  "google gemini": "Gemini",
  "google bard/gemini": "Gemini",
  "google bard / gemini": "Gemini",
  bard: "Gemini",
  "google gemini / imagen": "Gemini",
  imagen: "Gemini",
  veo: "Gemini",
  "google workspace ai": "Google Workspace",

  // OpenAI / ChatGPT product variants.
  // Keep the company name "OpenAI" separate for entity/visibility analysis.
  "openai's gpt": "ChatGPT",
  "openai's gpt-3": "ChatGPT",
  "openai's gpt-4": "ChatGPT",
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
  "microsoft bing chat": "Microsoft Copilot",

  // Products
  "jasper ai": "Jasper",
  "notion ai": "Notion",
  "github copilot": "GitHub Copilot",
  "copy ai": "Copy.ai",
  "copy.ai": "Copy.ai",
  copy: "Copy.ai",
  "microsoft visual studio": "Visual Studio",
  "swagger/openapi tools": "Swagger",
  alexa: "Amazon Alexa",
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

  // VPN product aliases
  protonvpn: "Proton VPN",
  "proton vpn (free tier)": "Proton VPN",
  mullvad: "Mullvad VPN",
  pia: "Private Internet Access",
  "pia (private internet access)": "Private Internet Access",
  "private internet access (pia)": "Private Internet Access",
  "surfshark vpn": "Surfshark",
  "surfshark (business plan)": "Surfshark",

  // Password manager SKUs → product
  "1password teams": "1Password",
  "1password business": "1Password",
  "1password business/teams": "1Password",
  "1password for teams": "1Password",
  "1password for teams/business": "1Password",
  "lastpass business": "LastPass",
  "lastpass teams": "LastPass",
  "bitwarden teams/enterprise": "Bitwarden",
  "bitwarden teams / enterprise": "Bitwarden",
  "keeper security": "Keeper",
  "keeper business": "Keeper",
  "keeper business/enterprise": "Keeper",
  "keeper business / enterprise": "Keeper",
  "keeper for business": "Keeper",
  "keeper for teams": "Keeper",
  "keeper security business/enterprise": "Keeper",
  "keeper security enterprise": "Keeper",
  "dashlane for business": "Dashlane",
  "dashlane business": "Dashlane",
  "bitwarden enterprise": "Bitwarden",
  "nordpass teams": "NordPass",
  "proton pass for business": "Proton Pass",
  "apple icloud keychain/passwords": "Apple iCloud Keychain",
  "apple passwords": "Apple iCloud Keychain",
  "apple keychain": "Apple iCloud Keychain",
  "keepass/keepassxc": "KeePassXC",

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
