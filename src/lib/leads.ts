export const LEAD_INTENTS = ["track_brand", "geo_audit"] as const;
export type LeadIntent = (typeof LEAD_INTENTS)[number];

export type LeadErrorCode =
  | "invalid_email"
  | "brand_required"
  | "brand_too_long"
  | "invalid_intent"
  | "consent_required"
  | "invalid_website"
  | "message_too_long"
  | "rate_limited"
  | "forbidden"
  | "payload_too_large"
  | "unsupported_media"
  | "invalid_json"
  | "save_failed"
  | "network";

export type LeadInput = {
  email?: unknown;
  brandName?: unknown;
  website?: unknown;
  intent?: unknown;
  message?: unknown;
  consent?: unknown;
  sourcePath?: unknown;
  companyUrl?: unknown; // honeypot
};

export type ParsedLead = {
  email: string;
  brandName: string;
  website: string | null;
  intent: LeadIntent;
  message: string | null;
  consent: true;
  sourcePath: string;
};

export type LeadParseResult =
  | { ok: true; honeypot: true }
  | { ok: true; honeypot: false; data: ParsedLead }
  | { ok: false; code: LeadErrorCode };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const LEAD_MAX_EMAIL_LEN = 254;
export const LEAD_MAX_BRAND_LEN = 120;
export const LEAD_MAX_MESSAGE_LEN = 500;
export const LEAD_MAX_WEBSITE_LEN = 200;
export const LEAD_RATE_LIMIT_PER_HOUR = 5;
export const LEAD_EMAIL_RATE_LIMIT_PER_HOUR = 3;
export const LEAD_MAX_BODY_BYTES = 8_192;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeWebsite(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^https?:\/\/$/i.test(value)) return null;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname || !url.hostname.includes(".")) return null;
    if (url.hostname.length > 253) return null;
    return url.toString().slice(0, LEAD_MAX_WEBSITE_LEN);
  } catch {
    return null;
  }
}

export function normalizeSourcePath(raw: string, fallback = "/"): string {
  const value = raw.trim() || fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("://")) return fallback;
  if (value.includes("\\") || value.includes("\0")) return fallback;
  return value.slice(0, 200);
}

export function isLeadIntent(value: string): value is LeadIntent {
  return (LEAD_INTENTS as readonly string[]).includes(value);
}

/**
 * Parse + validate lead payload. Honeypot filled → ok/honeypot (caller must not insert).
 */
export function parseLeadInput(input: LeadInput, fallbackSourcePath = "/"): LeadParseResult {
  if (asString(input.companyUrl)) {
    return { ok: true, honeypot: true };
  }

  const email = asString(input.email).toLowerCase();
  if (!email || email.length > LEAD_MAX_EMAIL_LEN || !EMAIL_RE.test(email)) {
    return { ok: false, code: "invalid_email" };
  }

  const brandName = asString(input.brandName);
  if (!brandName) {
    return { ok: false, code: "brand_required" };
  }
  if (brandName.length > LEAD_MAX_BRAND_LEN) {
    return { ok: false, code: "brand_too_long" };
  }

  const intentRaw = asString(input.intent);
  if (!isLeadIntent(intentRaw)) {
    return { ok: false, code: "invalid_intent" };
  }

  if (input.consent !== true && input.consent !== "true") {
    return { ok: false, code: "consent_required" };
  }

  const websiteRaw = asString(input.website);
  if (websiteRaw.length > LEAD_MAX_WEBSITE_LEN) {
    return { ok: false, code: "invalid_website" };
  }
  let website: string | null = null;
  if (websiteRaw && !/^https?:\/\/$/i.test(websiteRaw)) {
    website = normalizeWebsite(websiteRaw);
    if (!website) {
      return { ok: false, code: "invalid_website" };
    }
  }

  const messageRaw = asString(input.message);
  if (messageRaw.length > LEAD_MAX_MESSAGE_LEN) {
    return { ok: false, code: "message_too_long" };
  }

  return {
    ok: true,
    honeypot: false,
    data: {
      email,
      brandName,
      website,
      intent: intentRaw,
      message: messageRaw || null,
      consent: true,
      sourcePath: normalizeSourcePath(asString(input.sourcePath), fallbackSourcePath),
    },
  };
}

/** Same-site POST only (blocks casual cross-origin spam). */
export function isAllowedLeadOrigin(origin: string | null, host: string | null): boolean {
  if (!host) return false;
  if (!origin) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function leadErrorFromStatus(status: number, code?: string): LeadErrorCode {
  if (code && isLeadErrorCode(code)) return code;
  if (status === 429) return "rate_limited";
  if (status === 403) return "forbidden";
  if (status === 413) return "payload_too_large";
  if (status === 415) return "unsupported_media";
  if (status === 400) return "invalid_json";
  return "save_failed";
}

function isLeadErrorCode(value: string): value is LeadErrorCode {
  return (
    value === "invalid_email" ||
    value === "brand_required" ||
    value === "brand_too_long" ||
    value === "invalid_intent" ||
    value === "consent_required" ||
    value === "invalid_website" ||
    value === "message_too_long" ||
    value === "rate_limited" ||
    value === "forbidden" ||
    value === "payload_too_large" ||
    value === "unsupported_media" ||
    value === "invalid_json" ||
    value === "save_failed" ||
    value === "network"
  );
}
