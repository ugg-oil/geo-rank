import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  LEAD_EMAIL_RATE_LIMIT_PER_HOUR,
  LEAD_MAX_BODY_BYTES,
  LEAD_RATE_LIMIT_PER_HOUR,
  isAllowedLeadOrigin,
  parseLeadInput,
  type LeadErrorCode,
  type LeadInput,
} from "@/lib/leads";

function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

function hashIp(ip: string): string {
  const salt = process.env.LEAD_IP_SALT;
  if (!salt) {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
      throw new Error("LEAD_IP_SALT is required in production");
    }
    // Local/dev only fallback — never used in production.
    return createHash("sha256")
      .update(`${process.env.PIPELINE_SECRET || "geo-radar-lead-dev-salt"}:${ip}`)
      .digest("hex");
  }
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function fail(code: LeadErrorCode, status: number) {
  return NextResponse.json({ ok: false, code }, { status });
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return fail("unsupported_media", 415);
  }

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > LEAD_MAX_BODY_BYTES) {
    return fail("payload_too_large", 413);
  }

  if (!isAllowedLeadOrigin(req.headers.get("origin"), req.headers.get("host"))) {
    return fail("forbidden", 403);
  }

  let body: LeadInput;
  try {
    const raw = await req.text();
    if (raw.length > LEAD_MAX_BODY_BYTES) {
      return fail("payload_too_large", 413);
    }
    body = JSON.parse(raw) as LeadInput;
  } catch {
    return fail("invalid_json", 400);
  }

  const parsed = parseLeadInput(body);
  if (!parsed.ok) {
    return fail(parsed.code, 400);
  }
  if (parsed.honeypot) {
    return NextResponse.json({ ok: true });
  }

  const ipHash = (() => {
    try {
      return hashIp(clientIp(req));
    } catch {
      return null;
    }
  })();
  if (!ipHash) {
    return fail("save_failed", 500);
  }
  const since = new Date(Date.now() - 60 * 60 * 1000);

  const [recentIp, recentEmail] = await Promise.all([
    prisma.lead.count({ where: { ipHash, createdAt: { gte: since } } }),
    prisma.lead.count({
      where: { email: parsed.data.email, createdAt: { gte: since } },
    }),
  ]);

  if (recentIp >= LEAD_RATE_LIMIT_PER_HOUR || recentEmail >= LEAD_EMAIL_RATE_LIMIT_PER_HOUR) {
    return fail("rate_limited", 429);
  }

  try {
    await prisma.lead.create({
      data: {
        email: parsed.data.email,
        brandName: parsed.data.brandName,
        website: parsed.data.website,
        intent: parsed.data.intent,
        message: parsed.data.message,
        consent: parsed.data.consent,
        sourcePath: parsed.data.sourcePath,
        ipHash,
      },
    });
  } catch {
    return fail("save_failed", 500);
  }

  return NextResponse.json({ ok: true });
}
