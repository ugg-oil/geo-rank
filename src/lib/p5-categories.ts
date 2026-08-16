/** Phase 5 P5 categories — registered, prompted, backfilled (6 engines), launch-gate passed. */
export const P5_CATEGORIES = [
  "Project Management Tools",
  "CRM Platforms",
  "Customer Support / Helpdesk",
  "Accounting & Invoicing Software",
  "SEO / Content Tools",
  "Cloud Storage",
  "Design & Prototyping Tools",
  "Note-taking & Knowledge Base",
  "Email Marketing Tools",
  "HR Software",
  "Workflow Automation",
] as const;

export type P5Category = (typeof P5_CATEGORIES)[number];
