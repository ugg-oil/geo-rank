# Setup

环境、数据库与部署配置。产品介绍见 [README.md](../../README.md)，周更运维见 [operations.md](./operations.md)。

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
| `CRON_SECRET` | `/api/cron`、`/api/cron/catchup` 鉴权（可与 `PIPELINE_SECRET` 相同）。**GitHub Actions** 5 分钟补跑也读同名 repo secret，须与 Vercel 一致。 |
| `RESEND_API_KEY` | Resend API Key。与下两项同时配置时，Cron/健康检查失败会直发邮件。 |
| `PIPELINE_ALERT_EMAIL_TO` | 接收告警的邮箱。 |
| `PIPELINE_ALERT_EMAIL_FROM` | 已在 Resend 验证的发件人，例如 `GEO Radar Alerts <alerts@alerts.georadar.website>`。 |
| `PIPELINE_ALERT_WEBHOOK_URL` | 可选备用通道。邮件无法发送时接收 JSON 告警的通用 webhook。 |
| `PIPELINE_REQUEST_TIMEOUT_MS` | 单次 OpenRouter 请求超时，默认 45 秒 |
| `PIPELINE_COLLECTION_TIMEOUT_MS` | 采集阶段总超时，默认 20 分钟 |
| `PIPELINE_EXTRACTION_TIMEOUT_MS` | 抽取阶段总超时，默认 20 分钟 |
| `PIPELINE_STAGE_TIMEOUT_MS` | 规范化、分类、计分和发布等阶段超时，默认 20 分钟 |
| `PIPELINE_RUN_STALE_TIMEOUT_MS` | `running` 无心跳（`updated_at`）多久算死亡，默认 **90 分钟** |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 写入 Token（仅 `PUBLISH_BLOB_MIRROR=1` 时需要） |
| `BLOB_STORE_ID` | Vercel Blob Store ID（项目连接 Blob 后自动注入） |
| `PUBLISH_BLOB_MIRROR` | 设为 `1` 才在 publish 时写 Blob；默认跳过 |
| `LEADERBOARD_MANIFEST_URL` | 可选 Blob `latest/manifest.json` URL（元数据 fallback，非 SoT） |

本地开发可先不配 Blob / 不设 `PUBLISH_BLOB_MIRROR`；前台主读数据库。

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
4. （可选）Connect Blob Store；仅在需要镜像时设 `PUBLISH_BLOB_MIRROR=1` 与 `BLOB_READ_WRITE_TOKEN` / `BLOB_STORE_ID`
5. Deploy

### 邮件告警（Resend）

1. 在 [Resend](https://resend.com/) 创建 API Key，并验证用于 `PIPELINE_ALERT_EMAIL_FROM` 的发信域名。
2. 在 Vercel 的 **Production** 环境添加 `RESEND_API_KEY`、`PIPELINE_ALERT_EMAIL_TO` 和 `PIPELINE_ALERT_EMAIL_FROM`。
3. 重新部署。之后周更或健康检查失败时，系统优先发送邮件；邮件通道不可用时才尝试可选 webhook。

部署后验证：

- `https://georadar.website/robots.txt`
- `https://georadar.website/sitemap.xml`
- 任一品类页 `/category/ai-tools` 可打开

## 首次发布快照

1. 有周数据后执行 `npm run publish`（确认 DB 可读；默认跳过 Blob）
2. 若需 CDN 镜像：设 `PUBLISH_BLOB_MIRROR=1` 后重跑 publish，将输出的 `latestManifest` URL 写入 `LEADERBOARD_MANIFEST_URL`
3. Redeploy

详见 [operations.md](./operations.md)。
