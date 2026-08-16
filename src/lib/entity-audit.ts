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
  // P5 exclude seeds (category-selection.md) — score only blocked in listed categories.
  {
    sourceName: "Wix",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["E-commerce Platforms"],
    rationale: "Website builder, not an ecommerce store platform for this board.",
  },
  {
    sourceName: "Squarespace",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["E-commerce Platforms"],
    rationale: "Website builder, not an ecommerce store platform for this board.",
  },
  {
    sourceName: "Webflow",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["E-commerce Platforms"],
    rationale: "Website builder, not an ecommerce store platform for this board.",
  },
  {
    sourceName: "WordPress",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["E-commerce Platforms"],
    rationale: "CMS / site builder; not scored as an ecommerce platform here.",
  },
  {
    sourceName: "WordPress.com",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["E-commerce Platforms"],
    rationale: "Hosted CMS / site builder; not scored as an ecommerce platform here.",
  },
  {
    sourceName: "Zoom",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["AI Meeting Assistants"],
    rationale: "Video conferencing product; meeting-assistant board excludes conferencing giants.",
  },
  {
    sourceName: "Google Meet",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["AI Meeting Assistants"],
    rationale: "Video conferencing product; meeting-assistant board excludes conferencing giants.",
  },
  {
    sourceName: "Microsoft Teams",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["AI Meeting Assistants"],
    rationale: "Video conferencing / collab suite; meeting-assistant board excludes conferencing giants.",
  },
  {
    sourceName: "Cisco Webex",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["AI Meeting Assistants"],
    rationale: "Video conferencing product; meeting-assistant board excludes conferencing giants.",
  },
  {
    sourceName: "GoTo Meeting",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["AI Meeting Assistants"],
    rationale: "Video conferencing product; meeting-assistant board excludes conferencing giants.",
  },
  {
    sourceName: "Norton",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["AI Cybersecurity Tools"],
    rationale: "Traditional consumer antivirus; AI cybersecurity board excludes legacy AV suites.",
  },
  {
    sourceName: "McAfee",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["AI Cybersecurity Tools"],
    rationale: "Traditional consumer antivirus; AI cybersecurity board excludes legacy AV suites.",
  },
  {
    sourceName: "Kaspersky",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["AI Cybersecurity Tools"],
    rationale: "Traditional antivirus / endpoint suite; AI cybersecurity board excludes legacy AV.",
  },
  {
    sourceName: "Bitdefender",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["AI Cybersecurity Tools"],
    rationale: "Traditional antivirus / endpoint suite; AI cybersecurity board excludes legacy AV.",
  },
  {
    sourceName: "Avast",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["AI Cybersecurity Tools"],
    rationale: "Traditional consumer antivirus; AI cybersecurity board excludes legacy AV suites.",
  },
  {
    sourceName: "AVG",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["AI Cybersecurity Tools"],
    rationale: "Traditional consumer antivirus; AI cybersecurity board excludes legacy AV suites.",
  },
  {
    sourceName: "Workday",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["Recruiting Tools"],
    rationale: "Broad HRIS / HCM suite; recruiting board excludes general HRIS.",
  },
  {
    sourceName: "BambooHR",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["Recruiting Tools"],
    rationale: "HRIS / HR platform; recruiting board excludes general HRIS.",
  },
  {
    sourceName: "ADP",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["Recruiting Tools"],
    rationale: "Payroll / HRIS suite; recruiting board excludes general HRIS.",
  },
  {
    sourceName: "SAP SuccessFactors",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["Recruiting Tools"],
    rationale: "Broad HCM suite; recruiting board excludes general HRIS.",
  },
  {
    sourceName: "UKG",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["Recruiting Tools"],
    rationale: "HR / workforce suite; recruiting board excludes general HRIS.",
  },
  {
    sourceName: "Greenhouse",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["HR Software"],
    rationale: "ATS / recruiting platform; HRIS board excludes pure ATS tools.",
  },
  {
    sourceName: "Lever",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["HR Software"],
    rationale: "ATS / recruiting platform; HRIS board excludes pure ATS tools.",
  },
  {
    sourceName: "Ashby",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["HR Software"],
    rationale: "ATS / recruiting platform; HRIS board excludes pure ATS tools.",
  },
  {
    sourceName: "Workable",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["HR Software"],
    rationale: "ATS / recruiting platform; HRIS board excludes pure ATS tools.",
  },
  {
    sourceName: "Jobvite",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["HR Software"],
    rationale: "ATS / recruiting platform; HRIS board excludes pure ATS tools.",
  },
  {
    sourceName: "SmartRecruiters",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["HR Software"],
    rationale: "ATS / recruiting platform; HRIS board excludes pure ATS tools.",
  },
  {
    sourceName: "iCIMS",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["HR Software"],
    rationale: "ATS / recruiting platform; HRIS board excludes pure ATS tools.",
  },
  {
    sourceName: "Netflix",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["VPN Services"],
    rationale: "Streaming service mentioned for geo-unlocking; not a VPN product.",
  },
  {
    sourceName: "Disney+",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["VPN Services"],
    rationale: "Streaming service mentioned for geo-unlocking; not a VPN product.",
  },
  {
    sourceName: "Disney",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["VPN Services"],
    rationale: "Media brand mentioned for geo-unlocking; not a VPN product.",
  },
  {
    sourceName: "HBO Max",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["VPN Services"],
    rationale: "Streaming service mentioned for geo-unlocking; not a VPN product.",
  },
  {
    sourceName: "Hulu",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["VPN Services"],
    rationale: "Streaming service mentioned for geo-unlocking; not a VPN product.",
  },
  {
    sourceName: "BBC iPlayer",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["VPN Services"],
    rationale: "Streaming / catch-up service mentioned for geo-unlocking; not a VPN product.",
  },
  {
    sourceName: "CNET",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["VPN Services", "Password Managers"],
    rationale: "Review / media site, not a rankable product in these categories.",
  },
  {
    sourceName: "TechRadar",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["VPN Services", "Password Managers"],
    rationale: "Review / media site, not a rankable product in these categories.",
  },
  {
    sourceName: "PrivacyGuides.org",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["VPN Services"],
    rationale: "Review / recommendation site, not a VPN product.",
  },
  {
    sourceName: "Restore Privacy",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["VPN Services"],
    rationale: "Review / recommendation site, not a VPN product.",
  },
  {
    sourceName: "Amazon Prime Video",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["VPN Services"],
    rationale: "Streaming service mentioned for geo-unlocking; not a VPN product.",
  },
  {
    sourceName: "PCMag",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["VPN Services", "Password Managers"],
    rationale: "Review / media site, not a rankable product in these categories.",
  },
  {
    sourceName: "Techlore",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["VPN Services"],
    rationale: "Review / YouTube channel, not a VPN product.",
  },
  {
    sourceName: "Wirecutter",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["VPN Services", "Password Managers"],
    rationale: "Review / media site, not a rankable product in these categories.",
  },
  {
    sourceName: "Tom's Guide",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["VPN Services", "Password Managers"],
    rationale: "Review / media site, not a rankable product in these categories.",
  },
  {
    sourceName: "Secure & Fast",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["VPN Services"],
    rationale: "Generic non-product wording extracted from VPN answers.",
  },
  {
    sourceName: "NordVPN",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["Password Managers"],
    rationale: "VPN product; password-manager board ranks NordPass, not NordVPN.",
  },
  {
    sourceName: "Proton Mail",
    action: "reclassify_in_category",
    status: "ready_for_migration",
    excludedCategories: ["Password Managers"],
    rationale: "Email product; password-manager board ranks Proton Pass, not Proton Mail.",
  },
  {
    sourceName: "Kape Technologies",
    action: "reclassify",
    status: "ready_for_migration",
    parentCompany: "Kape Technologies",
    rationale: "Holding company behind ExpressVPN / CyberGhost; not a ranked VPN product.",
  },
  {
    sourceName: "ProtonVPN",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "Proton VPN",
    rationale: "Same product as Proton VPN.",
  },
  {
    sourceName: "Mullvad",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "Mullvad VPN",
    rationale: "Same product as Mullvad VPN.",
  },
  {
    sourceName: "Private Internet Access (PIA)",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "Private Internet Access",
    rationale: "Same product as Private Internet Access.",
  },
  {
    sourceName: "PIA (Private Internet Access)",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "Private Internet Access",
    rationale: "Same product as Private Internet Access.",
  },
  {
    sourceName: "PIA",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "Private Internet Access",
    rationale: "Same product as Private Internet Access.",
  },
  {
    sourceName: "1Password Teams",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "1Password",
    rationale: "SKU / plan name; rank the password manager product, not the plan.",
  },
  {
    sourceName: "1Password Business",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "1Password",
    rationale: "SKU / plan name; rank the password manager product, not the plan.",
  },
  {
    sourceName: "Keeper Security",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "Keeper",
    rationale: "Same product as Keeper.",
  },
  {
    sourceName: "LastPass Business",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "LastPass",
    rationale: "SKU / plan name; rank the password manager product, not the plan.",
  },
  {
    sourceName: "LastPass Teams",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "LastPass",
    rationale: "SKU / plan name; rank the password manager product, not the plan.",
  },
  {
    sourceName: "Bitwarden Teams/Enterprise",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "Bitwarden",
    rationale: "SKU / plan name; rank the password manager product, not the plan.",
  },
  {
    sourceName: "Bitwarden Teams / Enterprise",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "Bitwarden",
    rationale: "SKU / plan name; rank the password manager product, not the plan.",
  },
  {
    sourceName: "Keeper Business/Enterprise",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "Keeper",
    rationale: "SKU / plan name; rank the password manager product, not the plan.",
  },
  {
    sourceName: "Keeper Security Enterprise",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "Keeper",
    rationale: "SKU / plan name; rank the password manager product, not the plan.",
  },
  {
    sourceName: "Dashlane for Business",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "Dashlane",
    rationale: "SKU / plan name; rank the password manager product, not the plan.",
  },
  {
    sourceName: "NordPass Teams",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "NordPass",
    rationale: "SKU / plan name; rank the password manager product, not the plan.",
  },
  {
    sourceName: "Dashlane Business",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "Dashlane",
    rationale: "SKU / plan name; rank the password manager product, not the plan.",
  },
  {
    sourceName: "Bitwarden Enterprise",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "Bitwarden",
    rationale: "SKU / plan name; rank the password manager product, not the plan.",
  },
  {
    sourceName: "Apple iCloud Keychain/Passwords",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "Apple iCloud Keychain",
    rationale: "Same Apple password product as iCloud Keychain.",
  },
  {
    sourceName: "Apple Passwords",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "Apple iCloud Keychain",
    rationale: "Same Apple password product as iCloud Keychain.",
  },
  {
    sourceName: "Apple Keychain",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "Apple iCloud Keychain",
    rationale: "Same Apple password product as iCloud Keychain.",
  },
  {
    sourceName: "KeePass/KeePassXC",
    action: "merge",
    status: "ready_for_migration",
    canonicalName: "KeePassXC",
    rationale: "Combined mention; KeePassXC is the actively recommended fork.",
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
