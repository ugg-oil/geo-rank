# Setup

环境、数据库与部署配置。产品介绍见 [README.md](../README.md)，周更运维见 [operations.md](./operations.md)。

## 环境变量

```bash
cp .env.example .env
```

| 变量 | 用途 |
|------|------|
| `NEXT_PUBLIC_SITE_URL` | 正式域名（生产必须为 `https://georadar.website`） |
| `DATABASE_URL` | PostgreSQL 连接串 |
| `OPENROUTER_API_KEY` | OpenRouter API Key |
| `PIPELINE_SECRET` | `/api/pipeline`、`/api/publish` 鉴权 |
| `CRON_SECRET` | `/api/cron` 鉴权（可与 `PIPELINE_SECRET` 相同） |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 写入 Token |
| `BLOB_STORE_ID` | Vercel Blob Store ID（项目连接 Blob 后自动注入） |
| `LEADERBOARD_MANIFEST_URL` | 前台读取的 `latest/manifest.json` 公开 URL |

本地开发可先不配 Blob；未配置时前台会回退到数据库读取。

## 数据库

```bash
npm install
npm run db:push
npm run seed
```

常用：

```bash
npm run db:studio
```

## 本地启动

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

## 生产部署（Vercel）

1. 绑定自定义域名 `georadar.website`
2. 在 Vercel Environment Variables 配置上表变量（Production / Preview）
3. 确认 `NEXT_PUBLIC_SITE_URL=https://georadar.website`
4. Connect Blob Store，确保有 `BLOB_READ_WRITE_TOKEN` / `BLOB_STORE_ID`
5. Deploy

部署后验证：

- `https://georadar.website/robots.txt`
- `https://georadar.website/sitemap.xml`
- 任一品类页 `/category/ai-tools` 可打开

## 首次发布快照

1. 有周数据后执行 `npm run publish`（或触发线上 `/api/publish`）
2. 将输出的 `latestManifest` URL 写入 `LEADERBOARD_MANIFEST_URL`
3. Redeploy

详见 [operations.md](./operations.md)。
