import { CATEGORIES, type Category } from "@/lib/constants";

/** All published categories collect every 28 days. */
export const DEFAULT_PERIOD_DAYS = 28;

/** Period length in days. Source of truth aligned with docs/prd/category-selection.md. */
const CATEGORY_PERIOD_DAYS: Record<string, number> = Object.fromEntries(
  CATEGORIES.map((category) => [category, DEFAULT_PERIOD_DAYS])
);

export function getCategoryPeriodDays(category: string): number {
  return CATEGORY_PERIOD_DAYS[category] ?? DEFAULT_PERIOD_DAYS;
}

export function listConfiguredCategories(): string[] {
  return [...new Set([...CATEGORIES, ...Object.keys(CATEGORY_PERIOD_DAYS)])];
}

export function assertKnownPublishedCategory(category: string): category is Category {
  return (CATEGORIES as readonly string[]).includes(category);
}
