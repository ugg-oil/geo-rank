# GEO Radar

*AI visibility rankings for products recommended by ChatGPT, Gemini, and Grok.*

每周用 ChatGPT / Gemini / Grok 的 AI 回答，动态生成各品类 Top 20 品牌排行榜，衡量产品在 AI 推荐答案里的可见度。

## 文档

| 文档 | 说明 |
|------|------|
| [docs/PRD.md](./docs/PRD.md) | 产品需求 |
| [docs/data-pipeline.md](./docs/data-pipeline.md) | 数据管道与技术设计 |
| [docs/review-queue.md](./docs/review-queue.md) | Review Queue 操作与自动化审核 |

## 快速开始

### 1. 环境变量

复制 `.env.example` 为 `.env` 并填写：

- `DATABASE_URL` — PostgreSQL 连接串
- `OPENROUTER_API_KEY` — OpenRouter API Key
- `PIPELINE_SECRET` — 手动触发 `/api/pipeline` 的鉴权密钥
- `CRON_SECRET` — 周更 Cron `/api/cron` 的鉴权密钥（可与 `PIPELINE_SECRET` 相同）
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob 写入 Token，用于发布榜单快照
- `LEADERBOARD_MANIFEST_URL` — 前台读取的 `latest/manifest.json` 公开 URL

### 2. 初始化数据库

```bash
npm install
npm run db:push
npm run seed
```

### 3. 启动前端

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run pipeline` | 执行完整周更管道（采集→抽取→标准化→计分） |
| `npm run publish` | 将指定周榜单生成并上传到 Vercel Blob |
| `npm run review:auto` | 预览自动审核决策 |
| `npm run review:auto -- --apply` | 自动应用高置信度审核结果 |
| `npm run review:export` | 导出待确认品牌到 `data/review.json` |
| `npm run review:import` | 导入人工标注的 `data/review.json` |
| `npm run db:studio` | 打开 Prisma Studio |

## 周更流程

```bash
npm run pipeline
npm run review:auto -- --apply
```

Pipeline 完成计分后会自动发布榜单快照。前台优先读取 Vercel Blob 中的静态 JSON，Tab 切换不再访问数据库。未配置 Blob 时，开发环境会回退到数据库读取。

手动发布已有周次：

```bash
npm run publish -- "Week of 2026-07-27"
```

首次发布后，将命令输出的 `latestManifest` URL 配置为 `LEADERBOARD_MANIFEST_URL`。

每周运行结果会持久化到 `pipeline_runs` 表。生产检查时应确认最新记录的 `status=success`、`snapshot_count > 0`，并且生产环境有 `manifest_url`。

`data/` 目录为运行时临时文件（已 gitignore），审核结果入库后可删除。

## 技术栈

Next.js · PostgreSQL · Prisma · OpenRouter · Vercel Blob · Tailwind CSS
