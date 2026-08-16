export const CATEGORY_SLUG_MAP: Record<string, string> = {
  "ai-tools": "AI Tools",
  "saas-software": "SaaS Software",
  "ai-image-video-tools": "AI Image / Video Tools",
  "developer-tools": "Developer Tools",
  "marketing-tools": "Marketing Tools",
  "vpn-services": "VPN Services",
  "ecommerce-platforms": "E-commerce Platforms",
  "online-course-platforms": "Online Course Platforms",
  "language-learning-apps": "Language Learning Apps",
  "password-managers": "Password Managers",
  "ai-meeting-assistants": "AI Meeting Assistants",
  "ai-cybersecurity-tools": "AI Cybersecurity Tools",
  "recruiting-tools": "Recruiting Tools",
  "project-management-tools": "Project Management Tools",
  "crm-platforms": "CRM Platforms",
  "customer-support-helpdesk": "Customer Support / Helpdesk",
  "accounting-invoicing-software": "Accounting & Invoicing Software",
  "seo-content-tools": "SEO / Content Tools",
  "cloud-storage": "Cloud Storage",
  "design-prototyping-tools": "Design & Prototyping Tools",
  "note-taking-knowledge-base": "Note-taking & Knowledge Base",
  "email-marketing-tools": "Email Marketing Tools",
  "hr-software": "HR Software",
  "workflow-automation": "Workflow Automation",
};

export const CATEGORY_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_SLUG_MAP).map(([slug, name]) => [name, slug])
);
