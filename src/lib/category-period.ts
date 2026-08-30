import { CATEGORIES, type Category } from "@/lib/constants";

/** Period length in days. Source of truth aligned with docs/prd/category-selection.md. */
const CATEGORY_PERIOD_DAYS: Record<string, number> = {
  "AI Tools": 14,
  "AI Image / Video Tools": 14,
  "Marketing Tools": 14,
  "AI Meeting Assistants": 14,
  "AI Cybersecurity Tools": 14,
  "SaaS Software": 21,
  "Developer Tools": 21,
  "Online Course Platforms": 21,
  "Language Learning Apps": 21,
  "VPN Services": 21,
  "Password Managers": 21,
  "E-commerce Platforms": 21,
  "Recruiting Tools": 21,
  "Project Management Tools": 21,
  "CRM Platforms": 21,
  "Customer Support / Helpdesk": 21,
  "Accounting & Invoicing Software": 21,
  "SEO / Content Tools": 21,
  "Cloud Storage": 21,
  "Design & Prototyping Tools": 21,
  "Note-taking & Knowledge Base": 21,
  "Email Marketing Tools": 21,
  "HR Software": 21,
  "Workflow Automation": 21,
};

/** Fallback for unknown categories only. Configured 24 use the map above. */
export const DEFAULT_PERIOD_DAYS = 7;

export function getCategoryPeriodDays(category: string): number {
  return CATEGORY_PERIOD_DAYS[category] ?? DEFAULT_PERIOD_DAYS;
}

export function listConfiguredCategories(): string[] {
  return [...new Set([...CATEGORIES, ...Object.keys(CATEGORY_PERIOD_DAYS)])];
}

export function assertKnownPublishedCategory(category: string): category is Category {
  return (CATEGORIES as readonly string[]).includes(category);
}
