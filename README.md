# GEO Radar

Track which products are recommended by ChatGPT, Gemini, Grok, Perplexity, Claude, and DeepSeek.

GEO Radar measures AI visibility by analyzing AI-generated answers and producing period rankings across 24 categories.

![GEO Radar preview](./public/index.png)

Built for teams working on AI Visibility and Generative Engine Optimization (GEO).

## Why GEO Radar

AI assistants are becoming the new recommendation layer.

Instead of browsing ten blue links, users increasingly ask leading AI engines for product recommendations. GEO Radar tracks which brands appear most often in those answers and turns AI recommendations into measurable visibility rankings.

## Features

- Period AI visibility rankings (Overall + per-engine)
- 6-engine coverage: ChatGPT / Gemini / Grok / Perplexity / Claude / DeepSeek
- 24 categories (AI Tools, SaaS, Marketing, Developer Tools, CRM, and more)
- Category boards with compare, competition quadrant, and period movers
- Brand and company detail pages
- Transparent scoring methodology
- Historical ranking snapshots (PostgreSQL SoT)

## Live Site

**https://georadar.website**

## Example Pages

- [All rankings](https://georadar.website/rankings)
- [AI Tools](https://georadar.website/category/ai-tools)
- [SaaS Software](https://georadar.website/category/saas-software)
- [Marketing Tools](https://georadar.website/category/marketing-tools)
- [Developer Tools](https://georadar.website/category/developer-tools)
- [AI Image & Video Tools](https://georadar.website/category/ai-image-video-tools)
- [CRM Platforms](https://georadar.website/category/crm-platforms)

## How It Works

1. Query six AI engines with category-specific prompts
2. Extract and normalize brand mentions
3. Aggregate visibility signals
4. Calculate period visibility scores
5. Write leaderboard snapshots to PostgreSQL (optional Blob mirror)

Production cron advances the pipeline in stepped ticks (collect by engine soft budget; post-process packs stages in one tick when budget allows), with daily/hourly catchup. Local `npm run pipeline` still runs end-to-end.

## Tech Stack

- Next.js
- PostgreSQL
- Prisma
- OpenRouter
- Vercel Blob (optional mirror)
- Tailwind CSS

## Documentation

| Document | Description |
|----------|-------------|
| [docs/README.md](./docs/README.md) | Docs index |
| [docs/prd/phase-5/PRD-phase-5.md](./docs/prd/phase-5/PRD-phase-5.md) | Phase 5 PRD (current, released) |
| [docs/prd/phase-5/technical.md](./docs/prd/phase-5/technical.md) | Phase 5 technical design |
| [docs/prd/phase-4/PRD-phase-4.md](./docs/prd/phase-4/PRD-phase-4.md) | Phase 4 PRD |
| [docs/prd/phase-3/PRD-phase-3.md](./docs/prd/phase-3/PRD-phase-3.md) | Phase 3 PRD |
| [docs/engineering/architecture.md](./docs/engineering/architecture.md) | System architecture and data flow |
| [docs/ops/setup.md](./docs/ops/setup.md) | Environment, database, and deploy |
| [docs/ops/operations.md](./docs/ops/operations.md) | Pipeline, publish, cron, and operations |
| [docs/incidents/](./docs/incidents/) | Pipeline incident notes |

## Quick Start

### Install

```bash
npm install
```

### Configure Environment

```bash
cp .env.example .env
```

Fill in the required variables (see [docs/ops/setup.md](./docs/ops/setup.md)).

### Database

```bash
npm run db:push
npm run seed
```

### Start

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run pipeline` | Run full period pipeline |
| `npm run pipeline:health` | Check run / snapshot / publish health |
| `npm run publish` | Confirm DB snapshots; Blob only if `PUBLISH_BLOB_MIRROR=1` |
| `npm run review:auto` | Preview auto review |
| `npm run review:export` | Export review queue |
| `npm run review:import` | Import review decisions |
| `npm run reprocess` | Reprocess a period by rules |

## Period Update Flow

```bash
npm run pipeline
npm run review:auto -- --apply
```

After processing:

- Rankings are stored in PostgreSQL (`snapshots` = source of truth)
- Frontend builds leaderboards from DB
- Vercel Blob mirror is opt-in (`PUBLISH_BLOB_MIRROR=1`)

Details: [docs/ops/operations.md](./docs/ops/operations.md)

## SEO

Production checklist:

- Canonical URL configured
- robots.txt accessible
- sitemap.xml accessible
- Google Search Console verified
- Metadata configured
- Indexing requested

See [docs/engineering/seo.md](./docs/engineering/seo.md)

## License

MIT
