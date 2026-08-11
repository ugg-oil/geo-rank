import { prisma } from "@/lib/db";

const PROMPTS: Record<string, string[]> = {
  "AI Tools": [
    "What are the best AI tools for everyday productivity in 2026?",
    "Recommend top general-purpose AI assistants people should try.",
    "Which AI tools are most useful for research and summarizing information?",
    "What AI products would you recommend for beginners getting started with generative AI?",
    "List the leading AI tools used by startups and knowledge workers.",
    "What are the most popular AI chat and copilot products right now?",
    "Which AI tools are best for brainstorming and content ideation?",
    "Recommend well-known AI platforms that integrate into daily workflows.",
  ],
  "SaaS Software": [
    "What are the best SaaS tools for running a modern small business?",
    "Recommend popular software-as-a-service products used by startups.",
    "Which SaaS platforms are essential for team collaboration and operations?",
    "What SaaS tools would you recommend for sales and customer success teams?",
    "List widely used SaaS products for finance and subscription businesses.",
    "What are the top SaaS tools for product and project teams?",
    "Which cloud software products dominate the B2B SaaS landscape?",
    "Recommend mainstream SaaS apps that companies commonly subscribe to.",
  ],
  "AI Image / Video Tools": [
    "What are the best AI image generation tools in 2026?",
    "Recommend top AI video generation and editing products.",
    "Which AI tools are best for creating marketing visuals and thumbnails?",
    "What AI image or video products are most popular with creators?",
    "List leading generative AI tools for photos, illustrations, and short video.",
    "Which AI products would you recommend for text-to-image workflows?",
    "What are the best AI tools for text-to-video or avatar videos?",
    "Recommend well-known AI creative tools for visual content production.",
  ],
  "Developer Tools": [
    "What are the best developer tools and platforms for software teams in 2026?",
    "Recommend popular tools developers use for coding, review, and shipping software.",
    "Which developer productivity tools are most widely adopted?",
    "What tools would you recommend for cloud-native application development?",
    "List leading platforms for source control, CI/CD, and DevOps.",
    "Which AI coding assistants are most recommended for developers?",
    "What are the top tools for API development and testing?",
    "Recommend mainstream developer tools used by professional engineering teams.",
  ],
  "Marketing Tools": [
    "What are the best marketing tools for digital marketers in 2026?",
    "Recommend popular platforms for email, SEO, and campaign management.",
    "Which marketing SaaS tools are essential for growth teams?",
    "What tools would you recommend for social media marketing and scheduling?",
    "List leading products for marketing analytics and attribution.",
    "Which tools are best for content marketing and CMS-driven campaigns?",
    "What are the top advertising and marketing automation platforms?",
    "Recommend well-known marketing tools used by modern marketing teams.",
  ],
  "VPN Services": [
    "What are the best VPN services for personal privacy in 2026?",
    "Recommend top VPN providers people use to browse securely online.",
    "Which VPN services are most popular for streaming and accessing region-locked content?",
    "What VPN products would you recommend for travelers who need reliable connections abroad?",
    "List leading consumer VPN services known for strong encryption and no-logs policies.",
    "Which VPN apps are best for everyday use on phones and laptops?",
    "What are the most recommended VPN services for remote workers?",
    "Recommend well-known VPN platforms that individuals commonly subscribe to.",
  ],
  "E-commerce Platforms": [
    "What are the best ecommerce platforms for launching an online store in 2026?",
    "Recommend top ecommerce platforms merchants use to sell products online.",
    "Which ecommerce platforms are essential for building a scalable online shop?",
    "What platforms would you recommend for entrepreneurs who want to sell online?",
    "List leading ecommerce platforms for DTC brands and online retailers.",
    "Which ecommerce platforms work best for product catalogs, checkout, and orders?",
    "What are the top ecommerce platforms for managing inventory and online payments?",
    "Recommend well-known ecommerce platforms for selling online—not generic website builders.",
  ],
  "Online Course Platforms": [
    "What are the best online course platforms and MOOCs in 2026?",
    "Recommend top online course platforms for professional skills and career learning.",
    "Which cohort-based or online course platforms are most popular with adult learners?",
    "What online learning platforms would you recommend for structured courses and certificates?",
    "List leading online course platforms used for business and professional education.",
    "Which platforms are best for hosting or taking multi-week online courses?",
    "What are the most recommended MOOC and online course platforms right now?",
    "Recommend well-known online course platforms for adults pursuing skill development.",
  ],
  "Language Learning Apps": [
    "What are the best language learning apps in 2026?",
    "Recommend top language learning apps for beginners studying a new language.",
    "Which language learning apps are most popular for practicing speaking and vocabulary?",
    "What language learning apps would you recommend for daily practice on a phone?",
    "List leading language learning apps used by self-directed learners.",
    "Which apps are best for learning a foreign language with interactive lessons?",
    "What are the most recommended language learning apps for adults?",
    "Recommend well-known language learning apps that help people become conversational.",
  ],
  "Password Managers": [
    "What are the best password managers in 2026?",
    "Recommend top password manager apps for securing personal and work logins.",
    "Which password managers are most popular for storing and autofilling credentials?",
    "What password manager products would you recommend for teams that need shared vaults?",
    "List leading password managers known for encryption and cross-device sync.",
    "Which password managers are best for replacing browser-saved passwords?",
    "What are the most recommended password manager apps for everyday users?",
    "Recommend well-known password managers individuals commonly subscribe to.",
  ],
  "AI Meeting Assistants": [
    "What are the best AI meeting assistants for notes and transcripts in 2026?",
    "Recommend top AI meeting assistant tools that capture action items automatically.",
    "Which AI tools are best for meeting transcription and summaries after calls?",
    "What AI meeting assistants would you recommend for searchable meeting notes?",
    "List leading AI meeting note-takers used by remote and hybrid teams.",
    "Which AI meeting assistants help with transcripts, highlights, and follow-ups?",
    "What are the most popular AI tools for generating meeting summaries and action items?",
    "Recommend well-known AI meeting assistants for notes—not video conferencing apps.",
  ],
  "AI Cybersecurity Tools": [
    "What are the best AI cybersecurity tools for threat detection in 2026?",
    "Recommend top AI security products used for threat detection and response.",
    "Which AI-powered cybersecurity tools are most useful for SOC and security teams?",
    "What AI security tools would you recommend for detecting phishing and suspicious activity?",
    "List leading AI cybersecurity platforms for enterprise threat detection.",
    "Which AI tools are best for security operations and automated threat analysis?",
    "What are the most recommended AI-driven cybersecurity products right now?",
    "Recommend well-known AI security tools—not traditional consumer antivirus suites.",
  ],
  "Recruiting Tools": [
    "What are the best ATS and recruiting tools for hiring teams in 2026?",
    "Recommend top applicant tracking systems employers use to manage hiring pipelines.",
    "Which recruiting platforms are most popular for posting jobs and sourcing candidates?",
    "What ATS products would you recommend for startups building a hiring process?",
    "List leading recruiting tools for job boards, candidate sourcing, and interview workflows.",
    "Which AI recruiting tools help teams screen candidates and schedule interviews?",
    "What are the top recruiting platforms for employers hiring at scale?",
    "Recommend well-known ATS and recruiting tools—not general HRIS or payroll suites.",
  ],
};

async function main() {
  for (const [category, prompts] of Object.entries(PROMPTS)) {
    for (const text of prompts) {
      const existing = await prisma.prompt.findFirst({
        where: { category, promptText: text },
      });
      if (!existing) {
        await prisma.prompt.create({
          data: { category, promptText: text },
        });
      }
    }
    console.log(`Seeded ${prompts.length} prompts for ${category}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
