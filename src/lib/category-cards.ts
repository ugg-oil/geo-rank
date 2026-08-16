/** Grouping for the /rankings index — display order of the groups. */
export const CATEGORY_FAMILIES = [
  "ai",
  "productivity",
  "business",
  "marketing",
  "engineering",
  "security",
  "learning",
] as const;

export type CategoryFamily = (typeof CATEGORY_FAMILIES)[number];

export const CATEGORY_CARDS = [
  {
    name: "AI Tools",
    slug: "ai-tools",
    family: "ai",
    description:
      "See which AI assistants and copilots leading AI engines recommend most.",
  },
  {
    name: "SaaS Software",
    slug: "saas-software",
    family: "business",
    description:
      "Find the SaaS products that show up when buyers ask AI what to use.",
  },
  {
    name: "AI Image / Video",
    slug: "ai-image-video-tools",
    family: "ai",
    description:
      "Track which creative AI tools land in generative media recommendations.",
  },
  {
    name: "Developer Tools",
    slug: "developer-tools",
    family: "engineering",
    description:
      "See which coding and infrastructure tools AI keeps putting on shortlists.",
  },
  {
    name: "Marketing Tools",
    slug: "marketing-tools",
    family: "marketing",
    description:
      "Discover the growth platforms AI recommends for SEO, content, and campaigns.",
  },
  {
    name: "VPN Services",
    slug: "vpn-services",
    family: "security",
    description:
      "See which VPN providers AI recommends for privacy, streaming, and travel.",
  },
  {
    name: "E-commerce Platforms",
    slug: "ecommerce-platforms",
    family: "marketing",
    description:
      "Find the ecommerce platforms AI names for launching and scaling online stores.",
  },
  {
    name: "Online Course Platforms",
    slug: "online-course-platforms",
    family: "learning",
    description:
      "Track which MOOC and cohort platforms AI recommends for adult learners.",
  },
  {
    name: "Language Learning Apps",
    slug: "language-learning-apps",
    family: "learning",
    description:
      "See which language learning apps AI recommends for daily practice.",
  },
  {
    name: "Password Managers",
    slug: "password-managers",
    family: "security",
    description:
      "Discover which password managers AI recommends for personal and team vaults.",
  },
  {
    name: "AI Meeting Assistants",
    slug: "ai-meeting-assistants",
    family: "productivity",
    description:
      "See which AI meeting note-takers AI recommends for transcripts and action items.",
  },
  {
    name: "AI Cybersecurity Tools",
    slug: "ai-cybersecurity-tools",
    family: "security",
    description:
      "Track which AI security products land in threat detection shortlists.",
  },
  {
    name: "Recruiting Tools",
    slug: "recruiting-tools",
    family: "business",
    description:
      "Find the ATS and recruiting platforms AI recommends for hiring teams.",
  },
  {
    name: "Project Management Tools",
    slug: "project-management-tools",
    family: "productivity",
    description:
      "See which project and task tools AI recommends for planning and shipping work.",
  },
  {
    name: "CRM Platforms",
    slug: "crm-platforms",
    family: "business",
    description:
      "Track which CRM and sales pipeline platforms AI puts on shortlists.",
  },
  {
    name: "Customer Support / Helpdesk",
    slug: "customer-support-helpdesk",
    family: "business",
    description:
      "See which helpdesk and support inbox tools AI recommends for customer teams.",
  },
  {
    name: "Accounting & Invoicing Software",
    slug: "accounting-invoicing-software",
    family: "business",
    description:
      "Find the SMB accounting and invoicing products AI recommends most.",
  },
  {
    name: "SEO / Content Tools",
    slug: "seo-content-tools",
    family: "marketing",
    description:
      "Discover which SEO research and content tools land in AI recommendations.",
  },
  {
    name: "Cloud Storage",
    slug: "cloud-storage",
    family: "productivity",
    description:
      "See which cloud drive and file-sync products AI recommends for storing and sharing files.",
  },
  {
    name: "Design & Prototyping Tools",
    slug: "design-prototyping-tools",
    family: "productivity",
    description:
      "Track which UI, graphic, and prototyping tools AI names for design teams.",
  },
  {
    name: "Note-taking & Knowledge Base",
    slug: "note-taking-knowledge-base",
    family: "productivity",
    description:
      "See which notes and knowledge-base apps AI recommends for capturing and sharing knowledge.",
  },
  {
    name: "Email Marketing Tools",
    slug: "email-marketing-tools",
    family: "marketing",
    description:
      "Find the email and lifecycle marketing platforms AI recommends for campaigns.",
  },
  {
    name: "HR Software",
    slug: "hr-software",
    family: "business",
    description:
      "Track which HRIS and people-ops platforms AI recommends—distinct from ATS recruiting tools.",
  },
  {
    name: "Workflow Automation",
    slug: "workflow-automation",
    family: "engineering",
    description:
      "See which no-code automation tools AI recommends for connecting apps and workflows.",
  },
] as const satisfies readonly {
  name: string;
  slug: string;
  family: CategoryFamily;
  description: string;
}[];
