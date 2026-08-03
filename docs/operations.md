# Operations

周更管道、发布、Cron 与 Review Queue。环境配置见 [setup.md](./setup.md)。

## 周更流程

```bash
npm run pipeline
npm run review:auto -- --apply
```

Pipeline 完成后会尝试发布榜单快照到 Vercel Blob。前台优先读 Blob JSON；未配置 Blob 时回退数据库。

Pipeline 具有明确的超时边界：单次 OpenRouter 请求默认 45 秒，采集和抽取阶段默认各 20 分钟，规范化、分类、计分和发布等阶段默认各 20 分钟。超时后当前运行会标记为 `failed`，不会推进 `latest`。同一周已有运行时，新的触发不会并发启动；超过 30 小时的陈旧运行会先被标记为失败。

每次运行和发布都会写出一行 JSON 日志，可按 `runId`、`week`、`stage` 在 Vercel Logs 中检索。生产 Cron 在完成后还会检查快照数量与双 manifest 发布状态；检查失败时返回 500。若配置完整的 Resend 邮件变量，会直发告警邮件；可选 webhook 是邮件不可用时的备用通道。

## 命令

| 命令 | 说明 |
|------|------|
| `npm run pipeline` | 完整周更：采集 → 抽取 → 标准化 → 分类 → 计分 → 发布 |
| `npm run pipeline:health` | 检查当前周运行、快照和发布状态；不健康时以非零状态退出 |
| `npm run pipeline:fixtures` | 验证发布 manifest 的有效、旧周和缺榜单 fixture |
| `npm run publish` | 仅发布已有周次快照到 Blob |
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

健康状态要求：最新运行成功、`snapshot_count > 0`、并且 immutable week manifest 与 `latest` manifest 都已验证。健康时返回 `200`；任一条件未满足时返回 `503`，响应会给出具体原因。

### 邮件告警测试

在配置 Resend 变量后，可发送一封不运行 Pipeline 的测试邮件：

```bash
curl -X POST "https://georadar.website/api/pipeline-alert-test" \
  -H "Authorization: Bearer $PIPELINE_SECRET"
```

成功返回 `200`。测试邮件标题带有 `manual_alert_test`，不会调用 OpenRouter 或修改榜单数据。

## 发布产物

- 每周：`leaderboards/{week}/{slug}.json`
- 每周：`leaderboards/{week}/manifest.json`
- 当前：`leaderboards/latest/manifest.json`（发布提交点，短缓存）

前台在 `LEADERBOARD_MANIFEST_URL` 指向 `latest` 路径时，会按当前周推导并读取不可变的周 manifest，避免 mutable `latest` 的 CDN 缓存影响页面更新。

同一周的已验证快照允许通过 `npm run publish -- "Week of YYYY-MM-DD"` 幂等重发，用于修复发布中断；该操作不会重新采集或计分。

发布会先写各品类与 immutable week manifest，再写 `latest`，最后用 cache-busting 请求验证两份 manifest 的周次和五个品类链接。生产环境还会读取公开的 AI Tools 页，确认页面实际渲染当前周次（可用 `PIPELINE_PUBLIC_SMOKE_CHECK=0` 临时关闭）。任一步失败，发布状态会记录为 `failed`，不会被健康检查视为成功。

首次发布后，将 `latestManifest` URL 配置为 `LEADERBOARD_MANIFEST_URL`。

## 生产检查

运行结果会写入 `pipeline_runs`。检查最新记录：

- `status = success`
- `snapshot_count > 0`
- 生产环境有 `manifest_url`（若已发布）
- `publish_status = success`，且 `latest_manifest_url`、`published_at` 已写入

`data/` 为运行时临时目录（gitignore），审核结果入库后可删除。

## 相关文档

- [data-pipeline.md](./data-pipeline.md) — 管道设计细节
- [review-queue.md](./review-queue.md) — Review Queue 操作说明
- [seo.md](./seo.md) — 技术 SEO 检查与 SEO backlog
