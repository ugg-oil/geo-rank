# Operations

周更管道、发布、Cron 与 Review Queue。环境配置见 [setup.md](./setup.md)。

## 周更流程

```bash
npm run pipeline
npm run review:auto -- --apply
```

Pipeline 完成后默认**不**写 Vercel Blob。仅当显式设置 `PUBLISH_BLOB_MIRROR=1`（且具备 `BLOB_READ_WRITE_TOKEN` / `BLOB_STORE_ID`）时，才将榜单镜像到 Blob（`leaderboards/*`、`brands/*`、`companies/*`）。**前台主读 PostgreSQL `snapshots`（DB-first）**；Blob 为可选镜像，跳过或失败不否定该周对前台可读。

Pipeline 具有明确的超时边界：单次 OpenRouter 请求默认 45 秒，采集和抽取阶段默认各 20 分钟，规范化、分类、计分和发布等阶段默认各 20 分钟。超时后当前运行会标记为 `failed`，不会推进 `latest`。同一周已有运行时，新的触发不会并发启动；超过 30 小时的陈旧运行会先被标记为失败。

每次运行和发布都会写出一行 JSON 日志，可按 `runId`、`week`、`stage` 在 Vercel Logs 中检索。生产 Cron 在完成后还会检查快照数量与运行状态；缺 Blob manifest 记为 warning，不以之为硬失败。若配置完整的 Resend 邮件变量，会直发告警邮件；可选 webhook 是邮件不可用时的备用通道。

## 命令

| 命令 | 说明 |
|------|------|
| `npm run pipeline` | 完整周更：采集 → 抽取 → 标准化 → 分类 → 计分 → 发布 |
| `npm run pipeline:health` | 检查当前周运行、快照和发布状态；不健康时以非零状态退出 |
| `npm run pipeline:fixtures` | 验证发布 manifest 的有效、旧周和缺榜单 fixture |
| `npm run publish` | 确认 DB 快照可构建；默认跳过 Blob（见 `PUBLISH_BLOB_MIRROR`） |
| `npm run review:auto` | 预览自动审核 |
| `npm run review:auto -- --apply` | 应用高置信度审核结果 |
| `npm run review:export` | 导出待确认到 `data/review.json` |
| `npm run review:import` | 导入人工标注 |
| `npm run reprocess` | 按规则重处理指定周次 |

手动发布指定周：

```bash
npm run publish -- "Week of 2026-07-27"
```

## 线上触发

### 完整 pipeline

```bash
curl -X POST "https://georadar.website/api/pipeline" \
  -H "Authorization: Bearer $PIPELINE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 仅发布快照

```bash
curl -X POST "https://georadar.website/api/publish" \
  -H "Authorization: Bearer $PIPELINE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"week":"Week of 2026-07-27"}'
```

### Cron

```bash
curl "https://georadar.website/api/cron" \
  -H "Authorization: Bearer $CRON_SECRET"
```

鉴权失败返回 `401 Unauthorized`。

### 健康检查

```bash
curl "https://georadar.website/api/pipeline-health?week=Week%20of%202026-08-03" \
  -H "Authorization: Bearer $CRON_SECRET"
```

健康状态要求：最新运行成功、`snapshot_count > 0`。Blob `manifest_url` / `latest_manifest_url` 为可选镜像元数据；缺失时健康检查仍可返回 `200`（响应可带 `warnings`）。运行失败或无快照时返回 `503`。

### 邮件告警测试

在配置 Resend 变量后，可发送一封不运行 Pipeline 的测试邮件：

```bash
curl -X POST "https://georadar.website/api/pipeline-alert-test" \
  -H "Authorization: Bearer $PIPELINE_SECRET"
```

成功返回 `200`。测试邮件标题带有 `manual_alert_test`，不会调用 OpenRouter 或修改榜单数据。

## 发布产物

默认不写 Blob。开启镜像后产物路径为：

- 每周：`leaderboards/{week}/{slug}.json`
- 每周：`leaderboards/{week}/manifest.json`
- 当前：`leaderboards/latest/manifest.json`（发布提交点，短缓存）

### Blob 镜像 opt-in

| 变量 | 说明 |
|------|------|
| `PUBLISH_BLOB_MIRROR` | 设为 `1` 才执行 Blob `put`；未设置或其它值 → `publish_status=skipped`，日志含 `Blob mirror skipped` |
| `BLOB_READ_WRITE_TOKEN` / `BLOB_STORE_ID` | 镜像开启时仍需写凭证；缺凭证同样 skipped |
| `LEADERBOARD_MANIFEST_URL` | 可选；首页引擎计数等元数据 fallback，**不是**榜单 SoT |

R2 未实现；日后若要全球静态加速，仅作 mirror，永不 SoT。

前台周列表与品类榜从 DB `snapshots` 构建，不依赖 `LEADERBOARD_MANIFEST_URL` / `index.json` 完整性。

同一周的已验证快照允许通过 `npm run publish -- "Week of YYYY-MM-DD"` 幂等重跑（默认只校验 DB 可读；开镜像时才重写 Blob）；该操作不会重新采集或计分。

发布会先确认 DB 各品类快照可构建。未开镜像时立即 skipped。开启后写各品类与 immutable week manifest、`latest`，并用 cache-busting 请求验证；put/verify 失败时 `publish_status` 记为 `failed_mirror`，**不**使 pipeline `status` 失败（前提：`snapshot_count > 0`）。生产环境在 Blob 镜像成功时还会读取公开的 AI Tools 页做 smoke check（可用 `PIPELINE_PUBLIC_SMOKE_CHECK=0` 临时关闭）。

首次成功镜像后，可将 `latestManifest` URL 配置为 `LEADERBOARD_MANIFEST_URL`（仍非 SoT）。

## 生产检查

运行结果会写入 `pipeline_runs`。检查最新记录：

- `status = success`
- `snapshot_count > 0`
- `manifest_url` / `latest_manifest_url` 可选（Blob 镜像成功时有值）
- `publish_status` 可为 `success` | `skipped` | `failed_mirror`；不以缺 manifest 判红

`data/` 为运行时临时目录（gitignore），审核结果入库后可删除。

## 相关文档

- [data-pipeline-2026-07-30.md](../engineering/data-pipeline-2026-07-30.md) — 管道设计细节（legacy）
- [data-pipeline-db-primary-2026-08-08.md](../engineering/data-pipeline-db-primary-2026-08-08.md) — Snapshot SoT 决策
- [data-pipeline-db-primary-impl-2026-08-08.md](../engineering/data-pipeline-db-primary-impl-2026-08-08.md) — B1–B3 落地 runbook
- [review-queue.md](./review-queue.md) — Review Queue 操作说明
- [seo.md](../engineering/seo.md) — 技术 SEO 检查与 SEO backlog
