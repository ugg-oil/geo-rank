/**
 * Fill Brand.website from BRAND_WEBSITES (canonicalName → URL).
 * Existing non-empty websites are left alone unless --force.
 *
 *   npm run seed:brand-websites
 *   npx tsx src/scripts/seed-brand-websites.ts --force
 */
import { prisma } from "@/lib/db";
import { BRAND_WEBSITES } from "@/lib/brand-websites";
import { normalizeWebsite } from "@/lib/leads";

const force = process.argv.includes("--force");

async function main() {
  const brands = await prisma.brand.findMany({
    select: { id: true, canonicalName: true, website: true },
  });
  const byName = new Map(brands.map((b) => [b.canonicalName, b]));

  let updated = 0;
  let skippedHasUrl = 0;
  let missingBrand = 0;
  const missing: string[] = [];

  for (const [name, url] of Object.entries(BRAND_WEBSITES)) {
    const normalized = normalizeWebsite(url);
    if (!normalized) {
      missing.push(`${name} (bad url)`);
      continue;
    }
    const row = byName.get(name);
    if (!row) {
      missingBrand += 1;
      missing.push(name);
      continue;
    }
    if (row.website && !force) {
      skippedHasUrl += 1;
      continue;
    }
    await prisma.brand.update({ where: { id: row.id }, data: { website: normalized } });
    updated += 1;
  }

  const top20Null = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(DISTINCT s.brand_id)::bigint AS count
    FROM snapshots s
    INNER JOIN brands b ON b.id = s.brand_id
    WHERE s.engine IS NULL
      AND s.rank <= 20
      AND b.website IS NULL
      AND s.week IN (
        SELECT MAX(s2.week) FROM snapshots s2
        WHERE s2.engine IS NULL AND s2.category = s.category
      )
  `;

  console.log(
    JSON.stringify(
      {
        seedKeys: Object.keys(BRAND_WEBSITES).length,
        updated,
        skippedHasUrl,
        missingBrand,
        missing: missing.slice(0, 40),
        latestTop20StillNull: Number(top20Null[0]?.count ?? 0),
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
