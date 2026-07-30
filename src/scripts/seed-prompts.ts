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
