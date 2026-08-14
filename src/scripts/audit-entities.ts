import {
  ENTITY_AUDIT,
  approvedCanonicalName,
  isExcludedFromCategory,
} from "@/lib/entity-audit";
import { classifyEntity } from "@/lib/brand-entities";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Entity audit assertion failed: ${message}`);
}

assert(approvedCanonicalName("Copy") === "Copy.ai", "Copy canonical name");
assert(
  approvedCanonicalName("Microsoft Visual Studio") === "Visual Studio",
  "Visual Studio merge target"
);
assert(
  isExcludedFromCategory("SparkToro", "AI Image / Video Tools"),
  "SparkToro excluded from AI Image / Video Tools"
);
assert(
  !isExcludedFromCategory("SparkToro", "Marketing Tools"),
  "SparkToro remains eligible outside its incorrect category"
);
assert(
  isExcludedFromCategory("Wix", "E-commerce Platforms"),
  "Wix excluded from E-commerce Platforms"
);
assert(
  !isExcludedFromCategory("Wix", "SaaS Software"),
  "Wix remains eligible outside E-commerce Platforms"
);
assert(
  isExcludedFromCategory("Zoom", "AI Meeting Assistants"),
  "Zoom excluded from AI Meeting Assistants"
);
assert(
  isExcludedFromCategory("Norton", "AI Cybersecurity Tools"),
  "Norton excluded from AI Cybersecurity Tools"
);
assert(
  isExcludedFromCategory("Workday", "Recruiting Tools"),
  "Workday excluded from Recruiting Tools"
);
assert(
  isExcludedFromCategory("Netflix", "VPN Services"),
  "Netflix excluded from VPN Services"
);
assert(
  !isExcludedFromCategory("Netflix", "SaaS Software"),
  "Netflix remains eligible outside VPN Services"
);
assert(
  isExcludedFromCategory("BBC iPlayer", "VPN Services"),
  "BBC iPlayer excluded from VPN Services"
);
assert(
  approvedCanonicalName("ProtonVPN") === "Proton VPN",
  "ProtonVPN merges into Proton VPN"
);
assert(
  approvedCanonicalName("1Password Teams") === "1Password",
  "1Password Teams merges into 1Password"
);
assert(
  isExcludedFromCategory("Amazon Prime Video", "VPN Services"),
  "Amazon Prime Video excluded from VPN Services"
);
assert(
  isExcludedFromCategory("NordVPN", "Password Managers"),
  "NordVPN excluded from Password Managers"
);
assert(
  !isExcludedFromCategory("NordVPN", "VPN Services"),
  "NordVPN remains eligible on VPN Services"
);
assert(
  !classifyEntity("Black Forest Labs").rankingEnabled,
  "Black Forest Labs classified as a non-ranked company"
);

const readyForMigration = ENTITY_AUDIT.filter(
  (entry) => entry.status === "ready_for_migration"
);
const needsReview = ENTITY_AUDIT.filter((entry) => entry.status === "needs_review");

function printEntries(title: string, entries: typeof ENTITY_AUDIT) {
  console.log(`\n${title} (${entries.length})`);
  for (const entry of entries) {
    const target = entry.canonicalName ? ` → ${entry.canonicalName}` : "";
    const company = entry.parentCompany ? ` · company: ${entry.parentCompany}` : "";
    const categories = entry.excludedCategories?.length
      ? ` · categories: ${entry.excludedCategories.join(", ")}`
      : "";
    console.log(`- [${entry.action}] ${entry.sourceName}${target}${company}${categories}`);
    console.log(`  ${entry.rationale}`);
  }
}

console.log("GEO Radar entity-quality audit (local, read-only)");
printEntries("Ready for a controlled migration", readyForMigration);
printEntries("Needs product decision before changing data", needsReview);

console.log(
  `\nSummary: ${readyForMigration.length} ready for migration, ${needsReview.length} need review, ${ENTITY_AUDIT.length} total.`
);
