/**
 * Deterministic URL-safe slug from a brand's canonical display name.
 * Client-safe: no Node.js dependencies.
 *
 * Examples:
 *   "GitHub Copilot"     → "github-copilot"
 *   "DALL·E"             → "dall-e"
 *   "Copy.ai"            → "copyai"
 *   "IBM Watson"         → "ibm-watson"
 *   "monday.com"         → "mondaycom"
 *
 * Slugs are stable once a brand appears in a published board. Name changes
 * do not retroactively change published slugs (PRD: phase‑2).
 */
export function toBrandSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
