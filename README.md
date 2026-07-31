# GEO Radar

Track which products are recommended by ChatGPT, Gemini, and Grok.

GEO Radar measures AI visibility by analyzing AI-generated answers and producing weekly rankings across categories.

## Features

- Weekly AI Visibility Rankings
- ChatGPT / Gemini / Grok coverage
- AI Tools rankings
- SaaS rankings
- Marketing rankings
- Developer Tools rankings
- Transparent scoring methodology
- Historical ranking snapshots

## Live Site

**https://georadar.website**

## Example Rankings

- [AI Tools Visibility Rankings](https://georadar.website/category/ai-tools)
- [SaaS Visibility Rankings](https://georadar.website/category/saas-software)
- [Marketing Tools Visibility Rankings](https://georadar.website/category/marketing-tools)
- [Developer Tools Visibility Rankings](https://georadar.website/category/developer-tools)
- [AI Image & Video Visibility Rankings](https://georadar.website/category/ai-image-video-tools)

## How It Works

1. Collect AI-generated answers
2. Extract mentioned brands
3. Normalize brand entities
4. Score visibility
5. Generate weekly rankings

The ranking pipeline runs weekly and publishes static leaderboard snapshots.

## Tech Stack

- Next.js
- PostgreSQL
- Prisma
- OpenRouter
- Vercel Blob
- Tailwind CSS

## Documentation

| Document | Description |
|----------|-------------|
| [docs/PRD.md](./docs/PRD.md) | Product requirements |
| [docs/setup.md](./docs/setup.md) | Environment, database, and deploy |
| [docs/operations.md](./docs/operations.md) | Pipeline, publish, cron, review |
| [docs/data-pipeline.md](./docs/data-pipeline.md) | Data pipeline design |
| [docs/review-queue.md](./docs/review-queue.md) | Review workflow |
| [docs/seo-part1.md](./docs/seo-part1.md) | SEO launch checklist |

## Quick Start

### Install

```bash
npm install
```

### Configure Environment

```bash
cp .env.example .env
```

Fill in the required variables (see [docs/setup.md](./docs/setup.md)).

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
| `npm run pipeline` | Run weekly pipeline |
| `npm run publish` | Publish rankings to Blob |
| `npm run review:auto` | Preview auto review |
| `npm run review:export` | Export review queue |
| `npm run review:import` | Import review decisions |

## Weekly Update Flow

```bash
npm run pipeline
npm run review:auto -- --apply
```

After processing:

- Rankings are stored in PostgreSQL
- Snapshots are uploaded to Vercel Blob
- Frontend loads static leaderboard JSON

Details: [docs/operations.md](./docs/operations.md)

## SEO

Production checklist:

- Canonical URL configured
- robots.txt accessible
- sitemap.xml accessible
- Google Search Console verified
- Metadata configured
- Indexing requested

See [docs/seo-part1.md](./docs/seo-part1.md)

## License

MIT
