import { CATEGORIES, type Category } from "@/lib/constants";

/** Period length in days. Source of truth aligned with docs/prd/category-selection.md. */
const CATEGORY_PERIOD_DAYS: Record<string, number> = {
  "AI Tools": 7,
  "AI Image / Video Tools": 7,
  "Marketing Tools": 7,
  "AI Meeting Assistants": 7,
  "AI Cybersecurity Tools": 7,
  "SaaS Software": 14,
  "Developer Tools": 14,
  "Online Course Platforms": 14,
  "Language Learning Apps": 14,
  "VPN Services": 14,
  "Password Managers": 14,
  "E-commerce Platforms": 14,
  "Recruiting Tools": 14,
  "Project Management Tools": 14,
  "CRM Platforms": 14,
  "Customer Support / Helpdesk": 14,
  "Accounting & Invoicing Software": 14,
  "SEO / Content Tools": 14,
  "Cloud Storage": 14,
  "Design & Prototyping Tools": 14,
  "Note-taking & Knowledge Base": 14,
  "Email Marketing Tools": 14,
  "HR Software": 14,
  "Workflow Automation": 14,
};

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
