import { formatEngineList } from "@/lib/constants";

const ENGINE_COPY = formatEngineList();

const en = {
  nav: {
    rankings: "Rankings",
    methodology: "Methodology",
  },
  footer: {
    dataVia: "Data via official APIs",
    updatedWeekly: "Updated weekly",
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
    delta: "Δ",
    noData: "No data",
    top20: "Top 20",
    new: "NEW",
    out: "OUT",
    backToHome: "Back to home",
    allRankings: "All rankings",
    categoryRankings: "Category rankings",
    changeWeek: "Change ranking week",
    weekOf: (date: string) => `Week of ${date}`,
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
  },
  home: {
    badgeLive: (date: string) => `Live weekly rankings · Updated ${date}`,
    badgeFresh: "Live weekly rankings · Fresh every Monday",
    h1Line1: "Which products does",
    h1Line2: "AI actually recommend?",
    lead: "If AI engines never mention a product, customers never see it. GEO Radar shows the Top 20 that make the shortlist — every Monday.",
    ctaRankings: "See this week's rankings",
    ctaMethodology: "How we score them",
    whyTitle: "Why this matters",
    whyHeadline: "Search shows options. AI picks winners.",
    why1: "Buyers ask AI who to use — and trust the shortlist.",
    why2: "GEO Radar shows who made that shortlist this week.",
    statEngines: "AI engines tracked",
    statCategories: "Product categories",
    statPrompts: "Prompts every week",
    statTop20: "Products per board",
    engineStrip: "Rankings built from real answers across AI engines",
    howTitle: "Ask AI. Extract the shortlist. Rank it.",
    how1Title: "Ask the engines",
    how1Desc: "Every week we run the same discovery prompts across leading AI engines.",
    how2Title: "Pull the names",
    how2Desc: "We extract which products get mentioned — and how high they appear.",
    how3Title: "Publish the Top 20",
    how3Desc: "Scores update Monday with week-over-week movement, so you can see who rose.",
  },
  movers: {
    eyebrow: "Biggest Movers",
    title: "Who moved this week",
    subtitle: (week: string) => `Largest rank changes vs last week · ${week}`,
    rising: "Rising",
    falling: "Falling",
    noRisers: "No risers this week.",
    noFallers: "No fallers this week.",
    outSuffix: "out",
  },
  rankings: {
    eyebrow: "Rankings",
    h1Line1: "Pick a category.",
    h1Line2: "See who AI picks.",
    lead: "Weekly Top 20 boards across leading AI engines — refreshed every Monday.",
    categoriesCount: "5 categories",
    leaderThisWeek: "#1 this week",
  },
  category: {
    whoRecommends: (name: string) => `Who does AI recommend in ${name}?`,
    coverageExpansion: (engines: string) =>
      `This week's overall score now includes ${engines} in addition to last week's engines.`,
    emptyNone: "Rankings will appear after the first weekly collection.",
    emptyOverall: "Overall ranking requires at least 3 scoring engines this week.",
    emptyEngine: "This engine did not meet the valid-response threshold this week.",
    historicalUnavailable: "Historical week unavailable",
    historicalNone: (week: string) => `No published rankings are available for ${week}.`,
    backToLatest: "← Back to latest rankings",
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
      `${args.name}${args.parentPart} ranks #${args.rank} in ${args.category} with a score of ${args.score} and a mention frequency of ${args.mention}% across the latest weekly collection.${args.otherCategories}${args.engineDescs}`,
    productOf: (company: string) => `, a product of ${company}`,
    otherCategoriesOne: " It also appears in 1 other category.",
    otherCategoriesMany: (n: number) => ` It also appears in ${n} other categories.`,
    engineDiffs: (descs: string) => ` Engine differences: ${descs}.`,
    engineRanks: (engine: string, rank: number) => `${engine} ranks it #${rank}`,
    basedOn: (week: string) => `Based on data from ${week}.`,
    rankingsByCategory: "Rankings by Category",
    mentionFrequency: "Mention Frequency",
    perEngine: "Per Engine",
    rankHistory: "Rank History",
    scoreHistory: "Score History",
    historyWeeks: (n: number) => (n === 1 ? "1 wk" : `${n} wks`),
    sortBy: "Sort by",
    sortScore: "Score",
    sortRank: "Rank",
    sortMention: "Mention Frequency",
    trendRising: "Rising",
    trendStable: "Stable",
    trendDeclining: "Declining",
    similarBrands: "Similar Brands",
    similarEmpty: "No similar brands in this category this week.",
    categoryCompare: "Category comparison",
    vsBestRank: (delta: number) =>
      delta === 0 ? "Best rank among its categories" : `${delta} spots behind its best category rank`,
    vsBestScore: (delta: string) =>
      delta === "0.0" ? "Best score among its categories" : `${delta} below its best category score`,
    whyTrend: (label: string, category: string) =>
      ` Trend in ${category}: ${label}.`,
    whyCategories: (parts: string) => ` Across categories: ${parts}.`,
    whyCategoryPart: (category: string, rank: number, score: string) =>
      `${category} #${rank} (${score})`,
    ctaTitle: "Track your brand's AI visibility",
    ctaDesc: "Weekly updates on how your products appear across AI engines.",
    ctaButton: "Track Your Brand",
    comingSoon: "Coming soon",
  },
  lead: {
    title: "Track your brand's AI visibility",
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
    emptyProducts: "No ranked products for this company in the latest week.",
    mentionFrequency: "Mention Frequency",
    viewBrand: "Brand page",
    category: "Category",
    note: "Company pages aggregate products by ownership. There is no company-level score or rank.",
  },
  methodology: {
    title: "AI Visibility Methodology",
    subtitle: "How GEO Radar collects, scores, and publishes weekly AI visibility rankings",
    sections: [
      {
        title: "What is AI Visibility / GEO?",
        paragraphs: [
          "AI visibility measures how often and how prominently AI engines recommend specific products and brands. GEO (Generative Engine Optimization) is the methodology for improving and tracking that visibility, just as SEO tracks search result rankings.",
        ],
      },
      {
        title: "Data Collection",
        paragraphs: [
          `Every week, we query AI engines — ${ENGINE_COPY} — using 8 category-specific prompts per engine. All data is collected via official APIs, not web interfaces. Scoring engines are equal-weight. An engine that misses the weekly validity threshold is excluded from that category's overall score and shown as No data.`,
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
          "Rankings are not based on a fixed list. Each week, brands are dynamically discovered from AI responses. New brands are automatically added and scored. A human review process ensures brand names are properly normalized and deduplicated.",
        ],
      },
      {
        title: "Update Frequency",
        paragraphs: [
          'Rankings are updated weekly, every Monday. Data is labeled by the week\'s Monday date (e.g., "Week of 2026-07-27").',
        ],
      },
      {
        title: "Historical Estimates",
        paragraphs: [
          'Some early historical weeks may be labelled Backfilled estimate. These rankings are generated retrospectively using the current collection and scoring method; they are not observations collected during the labelled week. Regular weekly collection is labelled Observed.',
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
    updatedWeekly: "每周更新",
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
    delta: "Δ",
    noData: "暂无数据",
    top20: "Top 20",
    new: "NEW",
    out: "OUT",
    backToHome: "返回首页",
    allRankings: "全部排行榜",
    categoryRankings: "品类排行榜",
    changeWeek: "切换榜单周次",
    weekOf: (date: string) => `${date} 当周`,
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
  },
  home: {
    badgeLive: (date: string) => `每周实时榜单 · 更新于 ${date}`,
    badgeFresh: "每周实时榜单 · 每周一更新",
    h1Line1: "AI 真正在推荐",
    h1Line2: "哪些产品？",
    lead: "如果 AI 引擎从不提及某个产品，客户就看不到它。GEO Radar 每周一公布进入短名单的 Top 20。",
    ctaRankings: "查看本周榜单",
    ctaMethodology: "我们如何计分",
    whyTitle: "为什么重要",
    whyHeadline: "搜索给出选项。AI 选出赢家。",
    why1: "买家问 AI 该用谁——并相信那份短名单。",
    why2: "GEO Radar 展示本周谁进入了那份短名单。",
    statEngines: "追踪的 AI 引擎",
    statCategories: "产品品类",
    statPrompts: "每周 Prompt 数",
    statTop20: "每榜产品数",
    engineStrip: "榜单基于各 AI 引擎的真实回答",
    howTitle: "问 AI。抽出短名单。再排名。",
    how1Title: "询问引擎",
    how1Desc: "每周我们在主流 AI 引擎上跑同一组发现型 prompt。",
    how2Title: "提取名称",
    how2Desc: "我们提取哪些产品被提及——以及出现得多靠前。",
    how3Title: "发布 Top 20",
    how3Desc: "分数每周一更新，并带上周环比变动，方便看谁上升了。",
  },
  movers: {
    eyebrow: "最大变动",
    title: "本周谁在动",
    subtitle: (week: string) => `相对上周最大名次变化 · ${week}`,
    rising: "上升",
    falling: "下降",
    noRisers: "本周暂无上升产品。",
    noFallers: "本周暂无下降产品。",
    outSuffix: "跌出",
  },
  rankings: {
    eyebrow: "排行榜",
    h1Line1: "选一个品类。",
    h1Line2: "看 AI 选谁。",
    lead: "覆盖主流 AI 引擎的每周 Top 20 榜单——每周一刷新。",
    categoriesCount: "5 个品类",
    leaderThisWeek: "本周 #1",
  },
  category: {
    whoRecommends: (name: string) => `在 ${name} 品类，AI 推荐谁？`,
    coverageExpansion: (engines: string) =>
      `本周综合分已纳入 ${engines}，在上周引擎基础上扩展。`,
    emptyNone: "完成首次周度采集后将显示榜单。",
    emptyOverall: "综合榜本周至少需要 3 个达标计分引擎。",
    emptyEngine: "该引擎本周未达到有效回答门槛。",
    historicalUnavailable: "历史周不可用",
    historicalNone: (week: string) => `${week} 暂无已发布榜单。`,
    backToLatest: "← 返回最新榜单",
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
      `${args.name}${args.parentPart} 在 ${args.category} 排名第 ${args.rank}，得分为 ${args.score}，在最近一周采集中的提及频率为 ${args.mention}%。${args.otherCategories}${args.engineDescs}`,
    productOf: (company: string) => `（隶属于 ${company}）`,
    otherCategoriesOne: " 它还出现在另外 1 个品类中。",
    otherCategoriesMany: (n: number) => ` 它还出现在另外 ${n} 个品类中。`,
    engineDiffs: (descs: string) => ` 引擎差异：${descs}。`,
    engineRanks: (engine: string, rank: number) => `${engine} 将其排在第 ${rank}`,
    basedOn: (week: string) => `基于 ${week} 的数据。`,
    rankingsByCategory: "按品类排名",
    mentionFrequency: "提及频率",
    perEngine: "分引擎",
    rankHistory: "排名历史",
    scoreHistory: "得分历史",
    historyWeeks: (n: number) => `${n} 周`,
    sortBy: "排序",
    sortScore: "得分",
    sortRank: "名次",
    sortMention: "提及频率",
    trendRising: "上升",
    trendStable: "稳定",
    trendDeclining: "下降",
    similarBrands: "相似品牌",
    similarEmpty: "本周该品类暂无相似品牌。",
    categoryCompare: "品类对比",
    vsBestRank: (delta: number) =>
      delta === 0 ? "在其品类中名次最好" : `比其最好品类名次落后 ${delta} 位`,
    vsBestScore: (delta: string) =>
      delta === "0.0" ? "在其品类中得分最高" : `比其最高品类得分低 ${delta}`,
    whyTrend: (label: string, category: string) => ` ${category} 趋势：${label}。`,
    whyCategories: (parts: string) => ` 跨品类：${parts}。`,
    whyCategoryPart: (category: string, rank: number, score: string) =>
      `${category} 第 ${rank}（${score}）`,
    ctaTitle: "追踪你品牌的 AI 可见度",
    ctaDesc: "每周了解你的产品在各 AI 引擎中的出现情况。",
    ctaButton: "追踪你的品牌",
    comingSoon: "即将推出",
  },
  lead: {
    title: "追踪你品牌的 AI 可见度",
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
    emptyProducts: "该公司在最新一周暂无上榜产品。",
    mentionFrequency: "提及频率",
    viewBrand: "品牌页",
    category: "品类",
    note: "公司页按归属聚合产品，不设公司总分或公司排名。",
  },
  methodology: {
    title: "AI 可见度方法论",
    subtitle: "GEO Radar 如何采集、计分并发布每周 AI 可见度榜单",
    sections: [
      {
        title: "什么是 AI 可见度 / GEO？",
        paragraphs: [
          "AI 可见度衡量 AI 引擎推荐特定产品与品牌的频率和显著程度。GEO（生成式引擎优化）是提升与追踪这种可见度的方法论，正如 SEO 追踪搜索结果排名。",
        ],
      },
      {
        title: "数据采集",
        paragraphs: [
          `每周我们通过官方 API（而非网页界面）向 AI 引擎——${ENGINE_COPY}——各发送 8 条品类特定 prompt。计分引擎等权。未达到当周有效性门槛的引擎不计入该品类综合分，并显示为「暂无数据」。`,
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
          "榜单不基于固定名单。每周从 AI 回答中动态发现品牌，新品牌自动加入并计分。人工复核确保品牌名正确归一化与去重。",
        ],
      },
      {
        title: "更新频率",
        paragraphs: [
          "榜单每周一更新。数据按当周周一日期标注（例如「2026-07-27 当周」）。",
        ],
      },
      {
        title: "历史估算",
        paragraphs: [
          "部分早期历史周可能标注为「回填估算」。这些排名用当前采集与计分方法回溯生成，并非标注周当时的观测。常规周度采集标注为「观测」。",
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

export function formatWeekLabel(m: Messages, week: string) {
  const date = week.replace(/^Week of\s+/i, "");
  return m.common.weekOf(date);
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
