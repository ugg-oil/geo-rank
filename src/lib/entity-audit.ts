import { normalizeBrandKey } from "@/lib/brand-keys";

/**
 * Curated entity-quality decisions for leaderboard data.
 *
 * This registry is intentionally declarative: it is safe to review locally
 * and produces no database writes by itself. A future controlled migration
 * may consume only entries marked `approved`.
 */
export type EntityAuditAction =
  | "rename"
  | "merge"
  | "exclude"
  | "reclassify"
  | "reclassify_in_category"
  | "needs_review";

export type EntityAuditStatus = "ready_for_migration" | "needs_review";

export interface EntityAuditEntry {
  sourceName: string;
  action: EntityAuditAction;
  status: EntityAuditStatus;
  canonicalName?: string;
  parentCompany?: string;
  excludedCategories?: string[];
  rationale: string;
}

const RAW_ENTITY_AUDIT: EntityAuditEntry[] = [
  {
    sourceName: "Copy",
    action: "rename",
    status: "ready_for_migration",
    canonicalName: "Copy.ai",
    parentCompany: "Copy.ai",
    rationale: "“Copy” is ambiguous; the product’s public name is Copy.ai.",
  },
  {
    sourceName: "Microsoft Visual Studio",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "Visual Studio",
    parentCompany: "Microsoft",
    rationale: "This is the same IDE as Visual Studio, not a separate product.",
  },
  {
    sourceName: "Swagger/OpenAPI tools",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "Swagger",
    parentCompany: "SmartBear",
    rationale: "A product-family wording that would otherwise duplicate Swagger.",
  },
  {
    sourceName: "Black Forest Labs",
    action: "reclassify",
    status: "ready_for_migration",
    parentCompany: "Black Forest Labs",
    rationale: "Company behind FLUX; it is not the ranked product itself.",
  },
  {
    sourceName: "Stability AI",
    action: "reclassify",
    status: "ready_for_migration",
    parentCompany: "Stability AI",
    rationale: "Company behind Stable Diffusion; it is not the ranked product itself.",
  },
  {
    sourceName: "Google AI",
    action: "exclude",
    status: "ready_for_migration",
    parentCompany: "Google",
    rationale: "Generic company-area wording, not a distinct rankable product.",
  },
  {
    sourceName: "Amazon Web Services (AWS) AI",
    action: "exclude",
    status: "ready_for_migration",
    parentCompany: "Amazon",
    rationale: "A platform collection, not one identifiable product.",
  },
  {
    sourceName: "SparkToro",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["AI Image / Video Tools"],
    rationale: "A marketing-intelligence product; it must not rank in AI Image / Video Tools.",
  },
  {
    sourceName: "Salesforce",
    action: "needs_review",
    status: "needs_review",
    rationale: "Could denote the company or a specific CRM product; preserve until prompt/entity policy is decided.",
  },
  {
    sourceName: "Atlassian",
    action: "needs_review",
    status: "needs_review",
    rationale: "Could denote the company or its product suite; preserve until a product-level replacement is confirmed.",
  },
  {
    sourceName: "SAP Leonardo",
    action: "needs_review",
    status: "needs_review",
    parentCompany: "SAP",
    rationale: "May refer to a historical product name; requires current-product verification.",
  },
];

export const ENTITY_AUDIT = RAW_ENTITY_AUDIT.map((entry) => ({
  ...entry,
  sourceName: entry.sourceName.trim(),
}));

export const ENTITY_AUDIT_BY_SOURCE = new Map(
  ENTITY_AUDIT.map((entry) => [normalizeBrandKey(entry.sourceName), entry])
);

export function getEntityAuditEntry(name: string) {
  return ENTITY_AUDIT_BY_SOURCE.get(normalizeBrandKey(name));
}

export function approvedCanonicalName(name: string) {
  const entry = getEntityAuditEntry(name);
  return entry?.status === "ready_for_migration" && entry.canonicalName
    ? entry.canonicalName
    : null;
}

/** Category-only exclusions preserve a valid product in its relevant category. */
export function isExcludedFromCategory(name: string, category: string) {
  const entry = getEntityAuditEntry(name);
  return (
    entry?.status === "ready_for_migration" &&
    entry.action === "reclassify_in_category" &&
    entry.excludedCategories?.includes(category) === true
  );
}
