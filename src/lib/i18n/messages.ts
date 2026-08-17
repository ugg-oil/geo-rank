import { formatEngineList } from "@/lib/constants";

const ENGINE_COPY = formatEngineList();

const en = {
  nav: {
    rankings: "Rankings",
    methodology: "Methodology",
  },
  footer: {
    dataVia: "Data via official APIs",
    updatedWeekly: "Updated each period",
  },
  theme: {
    toLight: "Switch to light theme",
    toDark: "Switch to dark theme",
  },
  locale: {
    switchToZh: "Switch to Chinese",
    switchToEn: "Switch to English",
    shortEn: "EN",
    shortZh: "中文",
  },
  common: {
    overall: "Overall",
    product: "Product",
    company: "Company",
    score: "Score",
    appearance: "Appearance",
    avgRank: "Avg Rank",
    coverage: "Coverage",
    delta: "Change",
    noData: "No data",
    top20: "Top 20",
    new: "NEW",
    out: "OUT",
    backToHome: "Back to home",
    allRankings: "All rankings",
    categoryRankings: "Category rankings",
    changeWeek: "Change ranking period",
    weekOf: (date: string) => date,
    updated: (date: string) => `Updated ${date}`,
  },
  categories: {
    "ai-tools": {
      name: "AI Tools",
      short: "AI Tools",
      description: "See which AI assistants and copilots leading AI engines recommend most.",
      title: "The AI tools shortlist this week",
      lead: "See which assistants and copilots land in AI’s consideration set — so you spend less time on blind evals.",
      body: "Picking assistants and copilots is expensive when every trial burns time and workflow changes. Check who AI defaults to this week before you decide what to test — and watch which competitors are moving in or out of the shortlist, instead of choosing on gut feel.",
    },
    "saas-software": {
      name: "SaaS Software",
      short: "SaaS",
      description: "Find the SaaS products that show up when buyers ask AI what to use.",
      title: "The SaaS shortlist AI is giving buyers",
      lead: "When buyers ask AI for CRMs, project tools, and ops software, this board shows who shows up in those answers.",
      body: "CRM, project, and ops tools lock in process and switching costs once a team commits. See who AI puts in buyer answers this week before you shortlist demos — and track which competitors are rising or dropping out of those defaults.",
    },
    "ai-image-video-tools": {
      name: "AI Image / Video",
      short: "AI Image / Video",
      description: "Track which creative AI tools land in generative media recommendations.",
      title: "Which creative AI tools made the cut",
      lead: "See which image and video tools AI is naming for generative media right now.",
      body: "For content and campaigns, swapping image or video tools can slow the whole pipeline. See who AI is pushing this week before you decide what to trial — and watch which competitors are moving on the shortlist, instead of picking on gut feel.",
    },
    "developer-tools": {
      name: "Developer Tools",
      short: "Developer",
      description: "See which coding and infrastructure tools AI keeps putting on shortlists.",
      title: "What AI tells developers to use",
      lead: "When developers ask AI which IDE, database, or infra tool to pick, here’s who ends up on that shortlist.",
      body: "IDE, database, and infra choices stick — a bad pick costs migration time later. See who AI names for engineers this week before you invest in evals — and track which competitors stay on (or fall off) that shortlist.",
    },
    "marketing-tools": {
      name: "Marketing Tools",
      short: "Marketing",
      description: "Discover the growth platforms AI recommends for SEO, content, and campaigns.",
      title: "The marketing stack AI recommends",
      lead: "When marketers ask AI for SEO, email, analytics, and growth tools, this board shows which platforms get named.",
      body: "SEO, email, and analytics tools shape the whole growth loop; swapping mid-quarter is costly. See who AI recommends this week before you trial vendors — and watch which competitors are gaining or losing the recommendation slot.",
    },
    "vpn-services": {
      name: "VPN Services",
      short: "VPN",
      description: "See which VPN providers AI recommends for privacy, streaming, and travel.",
      title: "The VPN shortlist AI is giving users",
      lead: "When people ask AI for a VPN, this board shows which providers land in those answers.",
      body: "VPN choices lock in privacy, streaming access, and subscription spend. See who AI names this period before you commit — and track which competitors are moving on the shortlist.",
    },
    "ecommerce-platforms": {
      name: "E-commerce Platforms",
      short: "E-commerce",
      description: "Find the ecommerce platforms AI names for launching and scaling online stores.",
      title: "Which ecommerce platforms AI recommends",
      lead: "When merchants ask AI where to sell online, here’s who ends up on that shortlist.",
      body: "Store platforms shape catalog, checkout, and ops — switching later is expensive. See who AI recommends this period before you build — and watch which competitors hold the recommendation slot.",
    },
    "online-course-platforms": {
      name: "Online Course Platforms",
      short: "Courses",
      description: "Track which MOOC and cohort platforms AI recommends for adult learners.",
      title: "The online course platforms AI names",
      lead: "When learners ask AI for MOOCs and cohort courses, this board shows which platforms get recommended.",
      body: "Course platforms decide catalog quality and completion habits. See who AI pushes this period before you enroll or publish — and track which competitors are rising or dropping out.",
    },
    "language-learning-apps": {
      name: "Language Learning Apps",
      short: "Language",
      description: "See which language learning apps AI recommends for daily practice.",
      title: "Which language apps AI recommends",
      lead: "When people ask AI how to learn a language, here’s which apps land on the shortlist.",
      body: "Language apps compete on habit and progress. See who AI defaults to this period before you pick a daily practice tool — and watch which competitors move in or out.",
    },
    "password-managers": {
      name: "Password Managers",
      short: "Passwords",
      description: "Discover which password managers AI recommends for personal and team vaults.",
      title: "The password managers AI recommends",
      lead: "When users ask AI how to store passwords securely, this board shows which vaults get named.",
      body: "Password managers become infrastructure for logins and team sharing. See who AI recommends this period before you migrate vaults — and track which competitors stay on the shortlist.",
    },
    "ai-meeting-assistants": {
      name: "AI Meeting Assistants",
      short: "Meetings",
      description: "See which AI meeting note-takers AI recommends for transcripts and action items.",
      title: "Which AI meeting assistants made the cut",
      lead: "When teams ask AI for meeting notes and summaries, here’s who lands in those answers.",
      body: "Meeting assistants sit in every call workflow. See who AI names this period before you roll one out — and watch which competitors gain or lose the recommendation slot.",
    },
    "ai-cybersecurity-tools": {
      name: "AI Cybersecurity Tools",
      short: "AI Security",
      description: "Track which AI security products land in threat detection shortlists.",
      title: "The AI security tools AI recommends",
      lead: "When security teams ask AI for threat detection help, this board shows which products get named.",
      body: "Security tooling choices stick across SOC workflows. See who AI recommends this period before you evaluate vendors — and track which competitors are moving on the shortlist.",
    },
    "recruiting-tools": {
      name: "Recruiting Tools",
      short: "Recruiting",
      description: "Find the ATS and recruiting platforms AI recommends for hiring teams.",
      title: "Which ATS tools AI recommends",
      lead: "When hiring teams ask AI for ATS and recruiting software, here’s who ends up on that shortlist.",
      body: "ATS and sourcing tools lock in pipeline process. See who AI names this period before you shortlist demos — and watch which competitors rise or drop out of those defaults.",
    },
    "project-management-tools": {
      name: "Project Management Tools",
      short: "Project Management",
      description:
        "See which project and task tools AI recommends for planning and shipping work.",
      title: "Which project management tools AI recommends",
      lead: "When teams ask AI for project and task software, here’s who lands on that shortlist.",
      body: "Project tools lock in how work gets planned and tracked. See who AI names this period before you shortlist demos — and watch which competitors move on the board.",
    },
    "crm-platforms": {
      name: "CRM Platforms",
      short: "CRM",
      description: "Track which CRM and sales pipeline platforms AI puts on shortlists.",
      title: "Which CRM platforms AI recommends",
      lead: "When sales teams ask AI for CRM software, here’s who ends up on that shortlist.",
      body: "CRM choices lock in pipeline and customer data. See who AI names this period before you shortlist demos — and watch which competitors rise or drop.",
    },
    "customer-support-helpdesk": {
      name: "Customer Support / Helpdesk",
      short: "Support / Helpdesk",
      description:
        "See which helpdesk and support inbox tools AI recommends for customer teams.",
      title: "Which helpdesk tools AI recommends",
      lead: "When support teams ask AI for helpdesk and ticket software, here’s who lands on that shortlist.",
      body: "Helpdesk tools lock in how tickets and inboxes get handled. See who AI names this period before you evaluate vendors — and track movers on the shortlist.",
    },
    "accounting-invoicing-software": {
      name: "Accounting & Invoicing Software",
      short: "Accounting",
      description: "Find the SMB accounting and invoicing products AI recommends most.",
      title: "Which accounting tools AI recommends",
      lead: "When small businesses ask AI for accounting and invoicing software, here’s who gets named.",
      body: "Accounting tools lock in books and billing. See who AI recommends this period before you switch systems — and watch which competitors move on the board.",
    },
    "seo-content-tools": {
      name: "SEO / Content Tools",
      short: "SEO / Content",
      description:
        "Discover which SEO research and content tools land in AI recommendations.",
      title: "Which SEO tools AI recommends",
      lead: "When marketers ask AI for SEO research and content tools, here’s who ends up on that shortlist.",
      body: "SEO tooling shapes how teams research keywords and audit pages. See who AI names this period — not generic marketing suites — and track who is moving.",
    },
    "cloud-storage": {
      name: "Cloud Storage",
      short: "Cloud Storage",
      description:
        "See which cloud drive and file-sync products AI recommends for storing and sharing files.",
      title: "Which cloud storage products AI recommends",
      lead: "When people ask AI for cloud drives and file sync, here’s who lands on that shortlist.",
      body: "Cloud storage choices stick across devices and teams. See who AI names this period before you standardize — and watch whether big brands lock the board.",
    },
    "design-prototyping-tools": {
      name: "Design & Prototyping Tools",
      short: "Design / Prototyping",
      description:
        "Track which UI, graphic, and prototyping tools AI names for design teams.",
      title: "Which design tools AI recommends",
      lead: "When designers ask AI for UI, graphic, and prototyping software, here’s who gets named.",
      body: "Design tools lock in how teams ship interfaces and prototypes. See who AI recommends this period — not pure AI image generators — and track competitors on the shortlist.",
    },
    "note-taking-knowledge-base": {
      name: "Note-taking & Knowledge Base",
      short: "Notes / Knowledge",
      description:
        "See which notes and knowledge-base apps AI recommends for capturing and sharing knowledge.",
      title: "Which notes apps AI recommends",
      lead: "When people ask AI for notes and knowledge-base apps, here’s who lands on that shortlist.",
      body: "Notes and wiki tools lock in how teams capture knowledge. See who AI names this period — Notion can also show up on project boards — and watch movers on the shortlist.",
    },
    "email-marketing-tools": {
      name: "Email Marketing Tools",
      short: "Email Marketing",
      description:
        "Find the email and lifecycle marketing platforms AI recommends for campaigns.",
      title: "Which email marketing tools AI recommends",
      lead: "When marketers ask AI for email and lifecycle campaign tools, here’s who ends up on that shortlist.",
      body: "Email platforms lock in how campaigns and automations ship. See who AI names this period — distinct from generic marketing suites — and track who is moving.",
    },
    "hr-software": {
      name: "HR Software",
      short: "HR",
      description:
        "Track which HRIS and people-ops platforms AI recommends—distinct from ATS recruiting tools.",
      title: "Which HR software AI recommends",
      lead: "When people teams ask AI for HRIS and HR software, here’s who lands on that shortlist.",
      body: "HRIS choices lock in employee records and people ops. See who AI names this period — not ATS recruiting tools — and watch which competitors move.",
    },
    "workflow-automation": {
      name: "Workflow Automation",
      short: "Workflow Automation",
      description:
        "See which no-code automation tools AI recommends for connecting apps and workflows.",
      title: "Which workflow automation tools AI recommends",
      lead: "When operators ask AI for no-code automation to connect apps, here’s who gets named.",
      body: "Automation tools lock in how systems talk to each other. See who AI recommends this period — Zapier-class connectors, not full developer platforms — and track movers on the board.",
    },
  },
  home: {
    badgeLive: () => `Live AI visibility rankings`,
    badgeFresh: "Live AI visibility rankings",
    h1Line1: "Which products does",
    h1Line2: "AI actually recommend?",
    lead: "See how often leading AI engines mention your brand — and how that rank trends across collection periods — so you can improve GEO.",
    ctaRankings: "See latest rankings",
    ctaMethodology: "How we score them",
    periodCardTitle: "This period",
    periodStatEngines: "AI engines",
    periodStatPrompts: "Prompts",
    periodStatCategories: "Categories",
    periodMostVisible: "Most visible",
    periodBiggestMover: "Biggest mover",
    periodMoverSpots: (spots: number, dir: "up" | "down") =>
      dir === "up" ? `↑${spots}` : `↓${spots}`,
    top5Eyebrow: "Ranking preview",
    top5Title: (category: string) => `${category} · Top 5`,
    top5Period: (date: string) => `Period start · ${date}`,
    top5ViewFull: "View full ranking",
    insightsEyebrow: "Period insights",
    insightsTitle: "What moved this period",
    insightCrossRiser: (spots: number, category: string, from: string, to: string) =>
      ` climbed ${spots} in ${category} (${from} → ${to}).`,
    categoriesEyebrow: "Coverage",
    categoriesTitle: "Categories we track",
    categoriesViewAll: "View all categories",
    howEyebrow: "Method",
    howTitle: "Ask AI. Extract the shortlist. Rank it.",
    how1Title: "Ask the engines",
    how1Desc: "Each collection period we run the same discovery prompts across leading AI engines.",
    how2Title: "Pull the names",
    how2Desc: "We extract which products get mentioned — and how high they appear.",
    how3Title: "Publish the Top 20",
    how3Desc: "Scores update each period with movement vs the prior published period.",
  },
  movers: {
    eyebrow: "Biggest Movers",
    title: "Who moved this period",
    subtitle: (week: string) => `Largest rank changes vs prior period · ${week}`,
    rising: "Rising",
    falling: "Falling",
    noRisers: "No risers this period.",
    noFallers: "No fallers this period.",
    outSuffix: "out",
  },
  rankings: {
    h1Line1: "Pick a category.",
    h1Line2: "See who AI picks.",
    lead: "Top 20 boards across leading AI engines — refreshed on each category's collection period.",
    filterPlaceholder: "Search category or brand…",
    filterEmpty: "No categories match that name.",
    filterClear: "Clear search",
    unpublished: "Not published",
    unpublishedHint: "Rankings appear after this category's first published period.",
    unpublishedGroup: (count: number) => `Not published yet · ${count}`,
    viewBoard: "View full ranking",
    resultCount: (shown: number, total: number) =>
      shown === total ? `${total} categories` : `${shown} of ${total}`,
    families: {
      ai: "AI",
      productivity: "Work & Productivity",
      business: "Business Ops",
      marketing: "Marketing & Commerce",
      engineering: "Developer & Design",
      security: "Security & Privacy",
      learning: "Learning",
    },
  },
  category: {
    whoRecommends: (name: string) => `Who does AI recommend in ${name}?`,
    coverageExpansion: (engines: string) =>
      `This period's overall score now includes ${engines} in addition to the prior period's engines.`,
    emptyNone: "Rankings will appear after the first collection.",
    emptyOverall: "Overall ranking requires at least 3 scoring engines this period.",
    emptyEngine: "This engine did not meet the valid-response threshold this period.",
    sortBy: (label: string) => `Sort by ${label}`,
    sortedDesc: "highest first",
    sortedAsc: "lowest first",
    tipScore: "Composite AI visibility score for this period. Higher is better.",
    tipAppearance:
      "Share of this period's prompts where the product was mentioned at all. Higher is better.",
    tipAvgRank:
      "Average position within the answers that mention it — 1.0 means it is usually named first. Lower is better.",
    tipCoverage:
      "Share of scoring AI engines that ranked the product this period. Overall board only. Higher is better.",
    tipDelta: "Rank change vs the prior published period.",
    historicalUnavailable: "Historical period unavailable",
    historicalNone: (week: string) => `No published rankings are available for ${week}.`,
    backToLatest: "← Back to latest rankings",
    periodUpdated: (week: string) => `Period start · ${week}`,
    alsoMentionedTitle: "Also mentioned",
    alsoMentionedLead: (periodStart: string) =>
      `Brands mentioned as of this period (${periodStart}) but outside the Top 20.`,
    alsoMentionedMention: "Mention rate",
    /** Suffix after brand name — brand rendered as link in UI. */
    periodHighlightTookFirst: (category: string) => ` took #1 in ${category}.`,
    periodHighlightLargestClimb: (spots: number, rank: number) =>
      ` made the largest climb, up ${spots} to #${rank}.`,
    periodHighlightDebut: (rank: number) =>
      ` debuted at #${rank} — the highest new entry this period.`,
    quadrantTitle: "Competitive landscape",
    quadrantLead:
      "Overall Top 20 — mention frequency vs average rank. Split by this period's medians. Tap a point to see its name.",
    quadrantAxisX: "Mention frequency →",
    quadrantAxisY: "Average rank (#1 at top)",
    quadrantHighFreq: "High frequency",
    quadrantLowerFreq: "Lower frequency",
    quadrantHighPos: "High position",
    quadrantLowerPos: "Lower position",
    quadrantLeaders: "Leaders",
    quadrantChallengers: "Challengers",
    quadrantNiche: "Niche",
    quadrantLaggards: "Laggards",
    quadrantPointMetrics: (appearance: string, avgRank: string) =>
      `${appearance} mention rate · avg #${avgRank}`,
    compareSelect: (name: string) => `Select ${name} to compare`,
    compareLead: "Compare products",
    compareSelected: (count: number, max: number) => `${count} of ${max} selected`,
    compareHint: (max: number) => `Tick 2–${max} rows to compare them side by side.`,
    compareOpen: "Compare",
    compareClear: "Clear",
    compareClose: "Close",
    compareTitle: "Side-by-side",
    compareSubtitle: (board: string, periodStart: string) =>
      `${board} · period ${periodStart}`,
    compareBest: "Best",
    quadrantMovementToggle: "Show movement",
    quadrantMovementHint:
      "Faded dot = prior published period, arrow points to this period. Median lines use this period.",
    aboutMore: "About this ranking",
    aboutLess: "Hide details",
    boardTitle: "Top 20 this period",
    quadrantPointHint: "Hover or tap a dot for its metrics.",
  },
  brand: {
    lastUpdated: (week: string) => `Last updated · ${week}`,
    whyTitle: (name: string) => `Why AI recommends ${name}`,
    whyBody: (args: {
      name: string;
      parentPart: string;
      rank: number;
      category: string;
      score: string;
      mention: string;
      otherCategories: string;
      engineDescs: string;
    }) =>
      `${args.name}${args.parentPart} ranks #${args.rank} in ${args.category} with a score of ${args.score} and a mention frequency of ${args.mention}% in this period.${args.otherCategories}${args.engineDescs}`,
    productOf: (company: string) => `, a product of ${company}`,
    otherCategoriesOne: " It also appears in 1 other category.",
    otherCategoriesMany: (n: number) => ` It also appears in ${n} other categories.`,
    engineDiffs: (category: string, descs: string) =>
      ` Engine differences in ${category}: ${descs}.`,
    engineRanks: (engine: string, rank: number) => `${engine} ranks it #${rank}`,
    basedOn: (week: string) => `Based on ${week}`,
    whySummary: (args: {
      rank: number;
      category: string;
      score: string;
      mention: string;
    }) =>
      `#${args.rank} in ${args.category} · score ${args.score} · mention ${args.mention}%`,
    whyStrengths: "Strengths",
    whyWeaknesses: "Weaknesses",
    whyTrendTitle: "Trend",
    whyEnginesClose: "Engine ranks are close across collected engines.",
    whyStrengthBest: (engine: string, rank: number) =>
      `${engine} ranks it #${rank} — among its best engine placements.`,
    whyStrengthBeatsOverall: (engine: string, rank: number, overall: number) =>
      `${engine} ranks it #${rank}, clearly ahead of overall #${overall}.`,
    whyWeakAbsent: (engine: string) =>
      `${engine} barely mentions it — collected but not in that engine's Top 20.`,
    whyWeakRank: (engine: string, rank: number) =>
      `${engine} is weaker at #${rank}.`,
    whyTrendCard: (label: string, category: string) =>
      `${label} in ${category}.`,
    evidenceTitle: "Original recommendations",
    evidenceLead: "Unedited excerpts from AI answers in this period. English original only.",
    evidenceEngine: (engine: string) => engine,
    evidenceEmpty: "",
    evidenceCount: (n: number) => (n === 1 ? "1 engine" : `${n} engines`),
    evidenceExpandAll: "Expand all",
    evidenceCollapseAll: "Collapse all",
    rankingsByCategory: "Rankings by Category",
    rankingsEmpty: "This brand is not ranked in any category for this period.",
    rankingsEmptyLink: "Browse all rankings",
    mentionFrequency: "Mention Frequency",
    perEngine: "Per Engine",
    rankHistory: "Rank History",
    scoreHistory: "Score History",
    historyWeeks: (n: number) => (n === 1 ? "1 period" : `${n} periods`),
    historyRangeFrom: "From",
    historyRangeTo: "To",
    historyRangeEmpty: "No history points in this range.",
    sortBy: "Sort by",
    sortScore: "Score",
    sortRank: "Rank",
    sortMention: "Mention Frequency",
    trendRising: "Rising",
    trendStable: "Stable",
    trendDeclining: "Declining",
    similarBrands: "Nearby ranks in this category",
    similarEmpty: "No similar brands in this category this period.",
    categoryCompare: "Category comparison",
    vsBestRank: (delta: number) =>
      delta === 0 ? "Best rank among its categories" : `${delta} spots behind its best category rank`,
    vsBestScore: (delta: string) =>
      delta === "0.0" ? "Best score among its categories" : `${delta} below its best category score`,
    whyTrend: (label: string, category: string) =>
      ` Trend in ${category}: ${label}.`,
    ctaTitle: "Monitor this brand's AI visibility",
    ctaDesc: "Period updates on how this brand appears across AI engines.",
    ctaButton: "Monitor visibility",
    comingSoon: "Coming soon",
  },
  lead: {
    title: "Monitor this brand's AI visibility",
    desc: "Leave your details — we'll follow up when monitoring or a GEO audit opens up.",
    email: "Work email",
    brandName: "Brand name",
    website: "Website (optional)",
    message: "Message (optional)",
    intentLabel: "I'm interested in",
    intentTrack: "Track Your Brand",
    intentAudit: "Get GEO Audit",
    consent: "I agree to be contacted about GEO Radar for this brand.",
    submit: "Submit",
    submitting: "Submitting…",
    success: "Thanks — we received your request.",
    errorGeneric: "Something went wrong. Please try again.",
    rateLimited:
      "Too many submissions from this network or email (max a few per hour). Please try again later.",
    close: "Close",
    errors: {
      invalid_email: "Enter a valid work email.",
      brand_required: "Brand name is required.",
      brand_too_long: "Brand name is too long (max 120 characters).",
      invalid_intent: "Choose Track Your Brand or Get GEO Audit.",
      consent_required: "Please check the consent box to continue.",
      invalid_website: "Website looks invalid. Leave it blank or use a full domain like example.com.",
      message_too_long: "Message is too long (max 500 characters).",
      rate_limited:
        "Too many submissions from this network or email (max a few per hour). Please try again later.",
      forbidden: "This request was blocked for security. Refresh the page and try again.",
      payload_too_large: "The form payload is too large. Shorten the message and try again.",
      unsupported_media: "Unsupported request format. Refresh the page and try again.",
      invalid_json: "Something went wrong sending the form. Refresh and try again.",
      save_failed: "We couldn’t save your request. Please try again in a moment.",
      network: "Network error — check your connection and try again.",
    },
  },
  company: {
    lastUpdated: (week: string) => `Last updated · ${week}`,
    productsTitle: "Products",
    emptyProducts: "No ranked products for this company in the latest period.",
    emptyProductsCta: "Browse all rankings",
    mentionFrequency: "Mention Frequency",
    viewBrand: "Brand page",
    category: "Category",
    note: "Company pages aggregate products by ownership. There is no company-level score or rank.",
    summaryTitle: "This period",
    productCount: (n: number) => (n === 1 ? "1 product" : `${n} products`),
    categoryCount: (n: number) => (n === 1 ? "1 category" : `${n} categories`),
    bestProduct: (name: string, rank: number, category: string) =>
      `Best rank · ${name} #${rank} in ${category}`,
    biggestRiser: (name: string, spots: number, category: string) =>
      `Biggest rise · ${name} ↑${spots} in ${category}`,
    sortBy: "Sort by",
    sortRank: "Rank",
    sortScore: "Score",
    sortCategory: "Category",
  },
  methodology: {
    title: "AI Visibility Methodology",
    subtitle:
      "Helps brands see mention frequency and rank trends in leading AI recommendations — so they can improve GEO. Below is how we collect, score, and publish.",
    sections: [
      {
        title: "What is AI Visibility / GEO?",
        paragraphs: [
          "GEO Radar helps brands understand how often they appear in mainstream AI recommendations, and how that ranking trends over time, so they can improve GEO strategy.",
          "AI visibility measures how often and how prominently AI engines recommend specific products and brands. GEO (Generative Engine Optimization) is the methodology for improving and tracking that visibility, just as SEO tracks search result rankings.",
        ],
      },
      {
        title: "Data Collection",
        paragraphs: [
          `Each collection period, we query AI engines — ${ENGINE_COPY} — using 8 category-specific prompts per engine. All data is collected via official APIs, not web interfaces. Scoring engines are equal-weight. An engine that misses the period validity threshold is excluded from that category's overall score and shown as No data.`,
          "Responses are processed by a separate LLM to extract brand mentions and their order of appearance. Extracted brands are matched against a canonical brand database with alias support.",
        ],
      },
      {
        title: "Scoring Formula",
        intro: "Each brand receives an AI visibility score from 0 to 100:",
        formula:
          "Score = 0.50 × Appearance Rate + 0.40 × Avg Rank Score + 0.10 × Model Coverage",
        bullets: [
          {
            label: "Appearance Rate",
            text: " — percentage of valid responses that mention the brand",
          },
          {
            label: "Avg Rank Score",
            text: " — exponential decay based on average position: 100 × e−0.15 × (avgRank − 1)",
          },
          {
            label: "Model Coverage",
            text: " — fraction of that category's scoring engines that week that mention the brand. Historical weeks keep the denominator they were published with.",
          },
        ],
      },
      {
        title: "Engine Rankings",
        paragraphs: [
          "Individual engine rankings use a simplified formula without model coverage:",
        ],
        formula: "Engine Score = 0.55 × Appearance Rate + 0.45 × Avg Rank Score",
      },
      {
        title: "Dynamic Ranking",
        paragraphs: [
          "Rankings are not based on a fixed list. Each collection period, brands are dynamically discovered from AI responses. New brands are automatically added and scored. A human review process ensures brand names are properly normalized and deduplicated.",
        ],
      },
      {
        title: "Update Frequency",
        paragraphs: [
          'Rankings are updated on each category\'s collection period (7 or 14 days). Data is labeled by the period start date (e.g., "2026-07-27").',
        ],
      },
      {
        title: "Historical Estimates",
        paragraphs: [
          'Some early historical periods may be labelled Backfilled estimate. These rankings are generated retrospectively using the current collection and scoring method; they are not observations collected during the labelled period. Regular collection is labelled Observed.',
        ],
      },
    ],
  },
} as const;

const zh = {
  nav: {
    rankings: "排行榜",
    methodology: "方法论",
  },
  footer: {
    dataVia: "数据来自官方 API",
    updatedWeekly: "按周期更新",
  },
  theme: {
    toLight: "切换到浅色主题",
    toDark: "切换到深色主题",
  },
  locale: {
    switchToZh: "切换到中文",
    switchToEn: "Switch to English",
    shortEn: "EN",
    shortZh: "中文",
  },
  common: {
    overall: "综合",
    product: "产品",
    company: "公司",
    score: "得分",
    appearance: "出现率",
    avgRank: "平均名次",
    coverage: "覆盖率",
    delta: "变动",
    noData: "暂无数据",
    top20: "Top 20",
    new: "NEW",
    out: "OUT",
    backToHome: "返回首页",
    allRankings: "全部排行榜",
    categoryRankings: "品类排行榜",
    changeWeek: "切换榜单周期",
    weekOf: (date: string) => date,
    updated: (date: string) => `更新于 ${date}`,
  },
  categories: {
    "ai-tools": {
      name: "AI 工具",
      short: "AI 工具",
      description: "查看主流 AI 引擎最常推荐的 AI 助手与副驾驶工具。",
      title: "本周 AI 工具短名单",
      lead: "看哪些助手和副驾驶进入了 AI 的考虑集——少花时间盲测。",
      body: "助手和副驾驶一试就占时间，换工作流成本更高。先看 AI 这周默认推谁，再决定自己测哪些；同时盯住竞品谁在短名单里动，少靠感觉盲选。",
    },
    "saas-software": {
      name: "SaaS 软件",
      short: "SaaS",
      description: "看看买家问 AI「该用什么」时，哪些 SaaS 会出现。",
      title: "AI 给买家的 SaaS 短名单",
      lead: "买家问 AI 要 CRM、项目工具和运营软件时，这份榜单展示谁出现在那些回答里。",
      body: "CRM、项目和运营工具一旦落地就绑流程，切换贵。先看 AI 这周在买家回答里推谁，再排 demo 名单；同时盯住竞品谁在默认推荐里上升或掉出。",
    },
    "ai-image-video-tools": {
      name: "AI 图像 / 视频",
      short: "AI 图像 / 视频",
      description: "追踪哪些创意 AI 工具进入生成式媒体推荐。",
      title: "哪些创意 AI 工具进了短名单",
      lead: "看 AI 此刻在生成式媒体场景点名哪些图像与视频工具。",
      body: "做内容与投放时，图像视频工具一换就拖慢整条链路。先看 AI 这周默认推谁，再决定自己测哪些；同时盯住竞品谁在短名单里动，少靠感觉盲选。",
    },
    "developer-tools": {
      name: "开发者工具",
      short: "开发者",
      description: "看看 AI 持续放进短名单的编码与基础设施工具。",
      title: "AI 告诉开发者该用什么",
      lead: "开发者问 AI 该选哪款 IDE、数据库或基础设施时，这是最终进入短名单的产品。",
      body: "IDE、数据库和基础设施选错，后面迁移更贵。先看 AI 这周给工程师点谁的名，再投入评测；同时盯住竞品谁还在短名单里、谁掉出去了。",
    },
    "marketing-tools": {
      name: "营销工具",
      short: "营销",
      description: "发现 AI 在 SEO、内容与投放上推荐的增长平台。",
      title: "AI 推荐的营销技术栈",
      lead: "营销人问 AI 要 SEO、邮件、分析和增长工具时，这份榜单展示哪些平台被点名。",
      body: "SEO、邮件和分析工具牵动整条增长链路，季中硬换成本高。先看 AI 这周推荐谁，再安排试用；同时盯住竞品谁在抢或丢掉推荐位。",
    },
    "vpn-services": {
      name: "VPN 服务",
      short: "VPN",
      description: "看看 AI 在隐私、流媒体与旅行场景推荐哪些 VPN。",
      title: "AI 给用户的 VPN 短名单",
      lead: "人们问 AI 该用哪家 VPN 时，这份榜单展示谁出现在那些回答里。",
      body: "VPN 关系到隐私、解锁内容和订阅开支。先看 AI 本周期点谁的名，再决定订阅；同时盯住竞品谁在短名单里动。",
    },
    "ecommerce-platforms": {
      name: "电商平台",
      short: "电商",
      description: "发现 AI 为开店与扩店推荐的电商平台。",
      title: "AI 推荐的电商开店平台",
      lead: "商家问 AI 该在哪卖货时，这是最终进入短名单的平台。",
      body: "开店平台绑住商品、结账和履约，后面换栈很贵。先看 AI 本周期推谁，再决定建站；同时盯住竞品谁还占着推荐位。",
    },
    "online-course-platforms": {
      name: "在线课程平台",
      short: "课程",
      description: "追踪 AI 为成人学习者推荐的 MOOC 与 cohort 平台。",
      title: "AI 点名的在线课程平台",
      lead: "学习者问 AI 要 MOOC 和 cohort 课程时，这份榜单展示哪些平台被推荐。",
      body: "课程平台决定目录质量与完课习惯。先看 AI 本周期推谁，再报名或开课；同时盯住竞品谁在上升或掉出。",
    },
    "language-learning-apps": {
      name: "语言学习 App",
      short: "语言",
      description: "看看 AI 为日常练习推荐哪些语言学习 App。",
      title: "AI 推荐的语言学习 App",
      lead: "人们问 AI 怎么学一门语言时，这是进入短名单的应用。",
      body: "语言 App 拼的是习惯与进度。先看 AI 本周期默认推谁，再选每日练习工具；同时盯住竞品谁进谁出。",
    },
    "password-managers": {
      name: "密码管理器",
      short: "密码",
      description: "发现 AI 为个人与团队保险库推荐的密码管理器。",
      title: "AI 推荐的密码管理器",
      lead: "用户问 AI 如何安全存密码时，这份榜单展示哪些保险库被点名。",
      body: "密码管理器会变成登录与团队共享的基础设施。先看 AI 本周期推谁，再迁移保险库；同时盯住竞品谁还在短名单里。",
    },
    "ai-meeting-assistants": {
      name: "AI 会议助手",
      short: "会议",
      description: "看看 AI 为转写与待办推荐哪些会议笔记助手。",
      title: "哪些 AI 会议助手进了短名单",
      lead: "团队问 AI 要会议笔记和摘要时，这是出现在回答里的产品。",
      body: "会议助手嵌在每次通话流程里。先看 AI 本周期点谁，再决定落地；同时盯住竞品谁在抢或丢掉推荐位。",
    },
    "ai-cybersecurity-tools": {
      name: "AI 安全工具",
      short: "AI 安全",
      description: "追踪哪些 AI 安全产品进入威胁检测短名单。",
      title: "AI 推荐的 AI 安全工具",
      lead: "安全团队问 AI 要威胁检测方案时，这份榜单展示哪些产品被点名。",
      body: "安全工具选型会长期绑住 SOC 流程。先看 AI 本周期推谁，再安排评测；同时盯住竞品谁在短名单里动。",
    },
    "recruiting-tools": {
      name: "招聘工具",
      short: "招聘",
      description: "发现 AI 为招聘团队推荐的 ATS 与招聘平台。",
      title: "AI 推荐的 ATS / 招聘工具",
      lead: "招聘团队问 AI 要 ATS 和招聘软件时，这是最终进入短名单的产品。",
      body: "ATS 与 sourcing 工具一旦落地就绑流程。先看 AI 本周期点谁，再排 demo；同时盯住竞品谁在默认推荐里上升或掉出。",
    },
    "project-management-tools": {
      name: "项目管理工具",
      short: "项目管理",
      description: "查看 AI 为规划与交付工作推荐的项目与任务工具。",
      title: "AI 推荐的项目管理工具",
      lead: "团队问 AI 要项目与任务软件时，这是最终进入短名单的产品。",
      body: "项目管理工具一旦落地就绑住规划与跟踪方式。先看 AI 本周期点谁，再排 demo；同时盯住竞品谁在榜上动。",
    },
    "crm-platforms": {
      name: "客户关系管理",
      short: "CRM",
      description: "追踪哪些 CRM 与销售管道平台进入 AI 短名单。",
      title: "AI 推荐的 CRM 平台",
      lead: "销售团队问 AI 要 CRM 软件时，这是最终进入短名单的产品。",
      body: "CRM 选型会绑住管道与客户数据。先看 AI 本周期点谁，再排 demo；同时盯住竞品升降。",
    },
    "customer-support-helpdesk": {
      name: "客服与工单系统",
      short: "客服 / 工单",
      description: "查看 AI 为客服团队推荐的工单与收件箱工具。",
      title: "AI 推荐的客服 / 工单工具",
      lead: "客服团队问 AI 要工单与帮助台软件时，这是最终进入短名单的产品。",
      body: "工单系统一旦落地就绑住支持流程。先看 AI 本周期推谁，再评测供应商；同时盯住短名单谁在动。",
    },
    "accounting-invoicing-software": {
      name: "会计与发票软件",
      short: "会计 / 发票",
      description: "发现 AI 最常推荐的 SMB 会计与发票产品。",
      title: "AI 推荐的会计软件",
      lead: "小企业问 AI 要会计与发票软件时，这是被点名的产品。",
      body: "会计工具一旦落地就绑住账本与开票。先看 AI 本周期推谁，再换系统；同时盯住竞品谁在榜上动。",
    },
    "seo-content-tools": {
      name: "SEO 与内容工具",
      short: "SEO / 内容",
      description: "发现哪些 SEO 研究与内容工具进入 AI 推荐。",
      title: "AI 推荐的 SEO 工具",
      lead: "营销团队问 AI 要 SEO 研究与内容工具时，这是最终进入短名单的产品。",
      body: "SEO 工具塑造关键词研究与页面审计方式。先看 AI 本周期点谁——不是泛营销套件——再盯谁在动。",
    },
    "cloud-storage": {
      name: "云存储",
      short: "云存储",
      description: "查看 AI 为存档与分享推荐的云盘与文件同步产品。",
      title: "AI 推荐的云存储产品",
      lead: "人们问 AI 要云盘与文件同步时，这是最终进入短名单的产品。",
      body: "云存储选型会跨设备与团队长期固定。先看 AI 本周期点谁，再标准化；同时观察大厂是否锁榜。",
    },
    "design-prototyping-tools": {
      name: "设计与原型工具",
      short: "设计 / 原型",
      description: "追踪 AI 为设计团队点名的 UI、平面与原型工具。",
      title: "AI 推荐的设计工具",
      lead: "设计师问 AI 要 UI、平面与原型软件时，这是被点名的产品。",
      body: "设计工具一旦落地就绑住界面与原型交付。先看 AI 本周期推谁——不是纯 AI 图像生成器——再盯竞品短名单。",
    },
    "note-taking-knowledge-base": {
      name: "笔记与知识库",
      short: "笔记 / 知识库",
      description: "查看 AI 为记录与共享知识推荐的笔记与知识库应用。",
      title: "AI 推荐的笔记应用",
      lead: "人们问 AI 要笔记与知识库应用时，这是最终进入短名单的产品。",
      body: "笔记与 Wiki 工具一旦落地就绑住知识沉淀方式。先看 AI 本周期点谁——Notion 也可出现在项目管理榜——再盯短名单变动。",
    },
    "email-marketing-tools": {
      name: "邮件营销工具",
      short: "邮件营销",
      description: "发现 AI 为活动推荐的邮件与生命周期营销平台。",
      title: "AI 推荐的邮件营销工具",
      lead: "营销团队问 AI 要邮件与生命周期活动工具时，这是最终进入短名单的产品。",
      body: "邮件平台一旦落地就绑住活动与自动化发送。先看 AI 本周期点谁——有别于泛营销套件——再盯谁在动。",
    },
    "hr-software": {
      name: "HR 软件",
      short: "HR",
      description: "追踪 AI 推荐的 HRIS 与人事平台——有别于 ATS 招聘工具。",
      title: "AI 推荐的 HR 软件",
      lead: "人事团队问 AI 要 HRIS 与 HR 软件时，这是最终进入短名单的产品。",
      body: "HRIS 选型会绑住员工主数据与人事运营。先看 AI 本周期点谁——不是 ATS 招聘工具——再盯竞品升降。",
    },
    "workflow-automation": {
      name: "工作流自动化",
      short: "工作流自动化",
      description: "查看 AI 为连接应用与流程推荐的无代码自动化工具。",
      title: "AI 推荐的工作流自动化工具",
      lead: "运营问 AI 要无代码自动化来连接应用时，这是被点名的产品。",
      body: "自动化工具一旦落地就绑住系统对接方式。先看 AI 本周期推谁——Zapier 类连接器，不是完整开发平台——再盯榜上变动。",
    },
  },
  home: {
    badgeLive: () => `AI 可见度实时榜单`,
    badgeFresh: "AI 可见度实时榜单",
    h1Line1: "AI 真正在推荐",
    h1Line2: "哪些产品？",
    lead: "帮助品牌了解自己在主流 AI 推荐中的被提及频率与排名趋势，从而优化 GEO 策略。",
    ctaRankings: "查看最新榜单",
    ctaMethodology: "我们如何计分",
    periodCardTitle: "本周期",
    periodStatEngines: "AI 引擎",
    periodStatPrompts: "Prompt 数",
    periodStatCategories: "品类数",
    periodMostVisible: "最可见",
    periodBiggestMover: "最大变动",
    periodMoverSpots: (spots: number, dir: "up" | "down") =>
      dir === "up" ? `↑${spots}` : `↓${spots}`,
    top5Eyebrow: "榜单预览",
    top5Title: (category: string) => `${category} · Top 5`,
    top5Period: (date: string) => `周期起始 · ${date}`,
    top5ViewFull: "查看完整榜单",
    insightsEyebrow: "周期看点",
    insightsTitle: "本周期发生了什么",
    insightCrossRiser: (spots: number, category: string, from: string, to: string) =>
      ` 在 ${category} 上升 ${spots} 名（${from} → ${to}）。`,
    categoriesEyebrow: "覆盖范围",
    categoriesTitle: "我们追踪的品类",
    categoriesViewAll: "查看全部品类",
    howEyebrow: "方法",
    howTitle: "问 AI。抽出短名单。再排名。",
    how1Title: "询问引擎",
    how1Desc: "每个采集周期我们在主流 AI 引擎上跑同一组发现型 prompt。",
    how2Title: "提取名称",
    how2Desc: "我们提取哪些产品被提及——以及出现得多靠前。",
    how3Title: "发布 Top 20",
    how3Desc: "分数随周期更新，并相对上一已发布周期展示变动。",
  },
  movers: {
    eyebrow: "最大变动",
    title: "本周期谁在动",
    subtitle: (week: string) => `相对上一周期最大名次变化 · ${week}`,
    rising: "上升",
    falling: "下降",
    noRisers: "本周期暂无上升产品。",
    noFallers: "本周期暂无下降产品。",
    outSuffix: "跌出",
  },
  rankings: {
    h1Line1: "选一个品类。",
    h1Line2: "看 AI 选谁。",
    lead: "覆盖主流 AI 引擎的 Top 20 榜单——按各品类采集周期刷新。",
    filterPlaceholder: "搜索品类或品牌…",
    filterEmpty: "没有匹配的品类。",
    filterClear: "清除搜索",
    unpublished: "尚未发布",
    unpublishedHint: "该品类完成首次周期发布后显示榜单。",
    unpublishedGroup: (count: number) => `尚未发布 · ${count}`,
    viewBoard: "查看完整榜单",
    resultCount: (shown: number, total: number) =>
      shown === total ? `${total} 个品类` : `${shown} / ${total}`,
    families: {
      ai: "AI",
      productivity: "效率与协作",
      business: "业务运营",
      marketing: "营销与电商",
      engineering: "开发与设计",
      security: "安全与隐私",
      learning: "学习",
    },
  },
  category: {
    whoRecommends: (name: string) => `在 ${name} 品类，AI 推荐谁？`,
    coverageExpansion: (engines: string) =>
      `本周期综合分已纳入 ${engines}，在上一周期引擎基础上扩展。`,
    emptyNone: "完成首次周度采集后将显示榜单。",
    emptyOverall: "综合榜本周期至少需要 3 个达标计分引擎。",
    emptyEngine: "该引擎本周期未达到有效回答门槛。",
    sortBy: (label: string) => `按${label}排序`,
    sortedDesc: "从高到低",
    sortedAsc: "从低到高",
    tipScore: "本周期的 AI 可见度综合得分，越高越好。",
    tipAppearance: "本周期有多少比例的 Prompt 提到了该产品，越高越好。",
    tipAvgRank:
      "在提到它的回答里的平均出场位次——1.0 表示通常被第一个点名。越小越好。",
    tipCoverage: "本周期有多少比例的计分引擎给它排了名，仅综合榜有此列。越高越好。",
    tipDelta: "相对上一已发布周期的名次变化。",
    historicalUnavailable: "历史周期不可用",
    historicalNone: (week: string) => `${week} 暂无已发布榜单。`,
    backToLatest: "← 返回最新榜单",
    periodUpdated: (week: string) => `周期起始 · ${week}`,
    alsoMentionedTitle: "Also mentioned",
    alsoMentionedLead: (periodStart: string) =>
      `截止本周期 ${periodStart}，有提及但未进 Top 20 的品牌。`,
    alsoMentionedMention: "提及率",
    periodHighlightTookFirst: (category: string) => ` 登上 ${category} 第 1 名。`,
    periodHighlightLargestClimb: (spots: number, rank: number) =>
      ` 升幅最大，上升 ${spots} 名至第 ${rank} 名。`,
    periodHighlightDebut: (rank: number) =>
      ` 以第 ${rank} 名首次上榜，为本期最高新人。`,
    quadrantTitle: "竞争象限",
    quadrantLead:
      "综合榜 Top 20 — 提及频率 vs 平均名次。按本周期中位数划分。点按可显示品牌名。",
    quadrantAxisX: "提及频率 →",
    quadrantAxisY: "平均名次（#1 在上）",
    quadrantHighFreq: "高频",
    quadrantLowerFreq: "较低频",
    quadrantHighPos: "高位",
    quadrantLowerPos: "较低位",
    quadrantLeaders: "领导者",
    quadrantChallengers: "挑战者",
    quadrantNiche: "利基",
    quadrantLaggards: "落后",
    quadrantPointMetrics: (appearance: string, avgRank: string) =>
      `提及率 ${appearance} · 平均第 ${avgRank} 名`,
    compareSelect: (name: string) => `勾选 ${name} 加入对比`,
    compareLead: "产品对比",
    compareSelected: (count: number, max: number) => `已选 ${count}/${max}`,
    compareHint: (max: number) => `勾选 2–${max} 行，并排对比指标。`,
    compareOpen: "对比",
    compareClear: "清空",
    compareClose: "关闭",
    compareTitle: "并排对比",
    compareSubtitle: (board: string, periodStart: string) =>
      `${board} · 周期 ${periodStart}`,
    compareBest: "最优",
    quadrantMovementToggle: "显示位移",
    quadrantMovementHint:
      "淡点 = 上一已发布周期，箭头指向本周期。中位线按本周期计算。",
    aboutMore: "关于这个榜单",
    aboutLess: "收起说明",
    boardTitle: "本周期 Top 20",
    quadrantPointHint: "悬停或点击圆点查看指标。",
  },
  brand: {
    lastUpdated: (week: string) => `最近更新 · ${week}`,
    whyTitle: (name: string) => `为什么 AI 推荐 ${name}`,
    whyBody: (args: {
      name: string;
      parentPart: string;
      rank: number;
      category: string;
      score: string;
      mention: string;
      otherCategories: string;
      engineDescs: string;
    }) =>
      `${args.name}${args.parentPart} 在 ${args.category} 排名第 ${args.rank}，得分为 ${args.score}，在本周期中的提及频率为 ${args.mention}%。${args.otherCategories}${args.engineDescs}`,
    productOf: (company: string) => `（隶属于 ${company}）`,
    otherCategoriesOne: " 它还出现在另外 1 个品类中。",
    otherCategoriesMany: (n: number) => ` 它还出现在另外 ${n} 个品类中。`,
    engineDiffs: (category: string, descs: string) =>
      ` ${category} 的引擎差异：${descs}。`,
    engineRanks: (engine: string, rank: number) => `${engine} 将其排在第 ${rank}`,
    basedOn: (week: string) => `基于 ${week}`,
    whySummary: (args: {
      rank: number;
      category: string;
      score: string;
      mention: string;
    }) =>
      `${args.category} 第 ${args.rank} 名 · 得分 ${args.score} · 提及 ${args.mention}%`,
    whyStrengths: "优势",
    whyWeaknesses: "弱点",
    whyTrendTitle: "趋势",
    whyEnginesClose: "各引擎接近。",
    whyStrengthBest: (engine: string, rank: number) =>
      `${engine} 排到第 ${rank} 名——为其最佳引擎名次之一。`,
    whyStrengthBeatsOverall: (engine: string, rank: number, overall: number) =>
      `${engine} 第 ${rank} 名，明显好于综合第 ${overall} 名。`,
    whyWeakAbsent: (engine: string) =>
      `${engine} 几乎不提——已采集但未进该引擎 Top 20。`,
    whyWeakRank: (engine: string, rank: number) =>
      `${engine} 较弱，第 ${rank} 名。`,
    whyTrendCard: (label: string, category: string) =>
      `${category}：${label}。`,
    evidenceTitle: "推荐原文",
    evidenceLead: "本周期 AI 回答原文摘录，未改写；仅展示英文原文。",
    evidenceEngine: (engine: string) => engine,
    evidenceEmpty: "",
    evidenceCount: (n: number) => `${n} 个引擎`,
    evidenceExpandAll: "全部展开",
    evidenceCollapseAll: "全部收起",
    rankingsByCategory: "按品类排名",
    rankingsEmpty: "本周期该品牌未进入任何品类榜单。",
    rankingsEmptyLink: "查看全部排行榜",
    mentionFrequency: "提及频率",
    perEngine: "分引擎",
    rankHistory: "排名历史",
    scoreHistory: "得分历史",
    historyWeeks: (n: number) => `${n} 个周期`,
    historyRangeFrom: "起",
    historyRangeTo: "止",
    historyRangeEmpty: "该范围内无历史点。",
    sortBy: "排序",
    sortScore: "得分",
    sortRank: "名次",
    sortMention: "提及频率",
    trendRising: "上升",
    trendStable: "稳定",
    trendDeclining: "下降",
    similarBrands: "同品类相近排名",
    similarEmpty: "本周期该品类暂无相似品牌。",
    categoryCompare: "品类对比",
    vsBestRank: (delta: number) =>
      delta === 0 ? "在其品类中名次最好" : `比其最好品类名次落后 ${delta} 位`,
    vsBestScore: (delta: string) =>
      delta === "0.0" ? "在其品类中得分最高" : `比其最高品类得分低 ${delta}`,
    whyTrend: (label: string, category: string) => ` ${category} 趋势：${label}。`,
    ctaTitle: "监测该品牌可见度",
    ctaDesc: "按采集周期了解该品牌在各 AI 引擎中的出现情况。",
    ctaButton: "监测可见度",
    comingSoon: "即将推出",
  },
  lead: {
    title: "监测该品牌可见度",
    desc: "留下联系方式——监测或 GEO Audit 开放时我们会跟进。",
    email: "工作邮箱",
    brandName: "品牌名",
    website: "网站（选填）",
    message: "留言（选填）",
    intentLabel: "我感兴趣的是",
    intentTrack: "追踪品牌",
    intentAudit: "获取 GEO Audit",
    consent: "我同意 GEO Radar 就该品牌与我联系。",
    submit: "提交",
    submitting: "提交中…",
    success: "已收到，我们会尽快跟进。",
    errorGeneric: "提交失败，请重试。",
    rateLimited: "提交过于频繁（同一网络或邮箱每小时次数有限），请稍后再试。",
    close: "关闭",
    errors: {
      invalid_email: "请填写有效的工作邮箱。",
      brand_required: "请填写品牌名。",
      brand_too_long: "品牌名过长（最多 120 个字符）。",
      invalid_intent: "请选择「追踪品牌」或「获取 GEO Audit」。",
      consent_required: "请勾选同意联系后再提交。",
      invalid_website: "网站地址无效。可留空，或填写完整域名如 example.com。",
      message_too_long: "留言过长（最多 500 字）。",
      rate_limited: "提交过于频繁（同一网络或邮箱每小时次数有限），请稍后再试。",
      forbidden: "请求被安全策略拦截，请刷新页面后重试。",
      payload_too_large: "提交内容过大，请缩短留言后重试。",
      unsupported_media: "请求格式不正确，请刷新页面后重试。",
      invalid_json: "表单发送异常，请刷新后重试。",
      save_failed: "暂时无法保存，请稍后再试。",
      network: "网络异常，请检查连接后重试。",
    },
  },
  company: {
    lastUpdated: (week: string) => `最近更新 · ${week}`,
    productsTitle: "产品",
    emptyProducts: "该公司在最新周期暂无上榜产品。",
    emptyProductsCta: "查看全部排行榜",
    mentionFrequency: "提及频率",
    viewBrand: "品牌页",
    category: "品类",
    note: "公司页按归属聚合产品，不设公司总分或公司排名。",
    summaryTitle: "本周期表现",
    productCount: (n: number) => `${n} 个产品`,
    categoryCount: (n: number) => `${n} 个品类`,
    bestProduct: (name: string, rank: number, category: string) =>
      `最佳名次 · ${name} #${rank}（${category}）`,
    biggestRiser: (name: string, spots: number, category: string) =>
      `最大上升 · ${name} ↑${spots}（${category}）`,
    sortBy: "排序",
    sortRank: "名次",
    sortScore: "得分",
    sortCategory: "品类",
  },
  methodology: {
    title: "AI 可见度方法论",
    subtitle:
      "帮助品牌了解自己在主流 AI 推荐中的被提及频率与排名趋势，优化 GEO 策略。以下说明我们如何采集、计分与发布。",
    sections: [
      {
        title: "什么是 AI 可见度 / GEO？",
        paragraphs: [
          "GEO Radar 帮助品牌了解自己在主流 AI 推荐中的被提及频率与排名趋势，从而优化 GEO 策略。",
          "AI 可见度衡量 AI 引擎推荐特定产品与品牌的频率和显著程度。GEO（生成式引擎优化）是提升与追踪这种可见度的方法论，正如 SEO 追踪搜索结果排名。",
        ],
      },
      {
        title: "数据采集",
        paragraphs: [
          `每个采集周期我们通过官方 API（而非网页界面）向 AI 引擎——${ENGINE_COPY}——各发送 8 条品类特定 prompt。计分引擎等权。未达到当周期有效性门槛的引擎不计入该品类综合分，并显示为「暂无数据」。`,
          "回答由另一个 LLM 处理，提取品牌提及及其出现顺序。提取结果会匹配到带别名支持的规范品牌库。",
        ],
      },
      {
        title: "计分公式",
        intro: "每个品牌获得 0 到 100 的 AI 可见度分数：",
        formula:
          "Score = 0.50 × Appearance Rate + 0.40 × Avg Rank Score + 0.10 × Model Coverage",
        bullets: [
          {
            label: "Appearance Rate（出现率）",
            text: " — 提及该品牌的有效回答占比",
          },
          {
            label: "Avg Rank Score（平均名次分）",
            text: " — 基于平均位次的指数衰减：100 × e−0.15 × (avgRank − 1)",
          },
          {
            label: "Model Coverage（模型覆盖）",
            text: " — 当周该品类计分引擎中提及该品牌的比例。历史周保留发布时的分母。",
          },
        ],
      },
      {
        title: "引擎分榜",
        paragraphs: [
          "单个引擎榜单使用不含模型覆盖的简化公式：",
        ],
        formula: "Engine Score = 0.55 × Appearance Rate + 0.45 × Avg Rank Score",
      },
      {
        title: "动态发现排名",
        paragraphs: [
          "榜单不基于固定名单。每个采集周期从 AI 回答中动态发现品牌，新品牌自动加入并计分。人工复核确保品牌名正确归一化与去重。",
        ],
      },
      {
        title: "更新频率",
        paragraphs: [
          "榜单按各品类采集周期更新（7 或 14 天）。数据按周期起始日标注（例如「2026-07-27」）。",
        ],
      },
      {
        title: "历史估算",
        paragraphs: [
          "部分早期历史周期可能标注为「回填估算」。这些排名用当前采集与计分方法回溯生成，并非标注周期当时的观测。常规采集标注为「观测」。",
        ],
      },
    ],
  },
} as const;

type WidenStrings<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => WidenStrings<R>
    : T extends readonly (infer U)[]
      ? WidenStrings<U>[]
      : T extends object
        ? { [K in keyof T]: WidenStrings<T[K]> }
        : T;

export type Messages = WidenStrings<typeof en>;
export type CategorySlug = keyof typeof en.categories;

export const messages = { en, zh } as unknown as Record<"en" | "zh", Messages>;

export function getCategoryMessages(m: Messages, slug: string) {
  return m.categories[slug as CategorySlug] ?? null;
}

export function formatWeekLabel(_m: Messages, week: string) {
  // P0: display bare YYYY-MM-DD only (no "Week of").
  return week.replace(/^Week of\s+/i, "");
}

const EN_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Parse YYYY-MM-DD (or ISO prefix) as UTC calendar date — no Intl (avoids SSR/client ICU drift). */
function parseUtcYmd(iso: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (match) {
    return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

/** Chart axis: "Jul 6" / "7月6日" */
export function formatShortUtcDate(locale: "en" | "zh", iso: string): string {
  const parts = parseUtcYmd(iso);
  if (!parts) return iso;
  if (locale === "zh") return `${parts.month}月${parts.day}日`;
  return `${EN_MONTHS[parts.month - 1]} ${parts.day}`;
}

/** Full date: "Jul 6, 2026" / "2026年7月6日" */
export function formatLocaleDate(locale: "en" | "zh", iso: string) {
  const parts = parseUtcYmd(iso);
  if (!parts) return iso;
  if (locale === "zh") return `${parts.year}年${parts.month}月${parts.day}日`;
  return `${EN_MONTHS[parts.month - 1]} ${parts.day}, ${parts.year}`;
}
