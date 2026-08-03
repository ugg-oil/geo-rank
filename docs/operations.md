# Operations

周更管道、发布、Cron 与 Review Queue。环境配置见 [setup.md](./setup.md)。

## 周更流程

```bash
npm run pipeline
npm run review:auto -- --apply
```

Pipeline 完成后会尝试发布榜单快照到 Vercel Blob。前台优先读 Blob JSON；未配置 Blob 时回退数据库。

Pipeline 具有明确的超时边界：单次 OpenRouter 请求默认 45 秒，采集和抽取阶段默认各 20 分钟，规范化、分类、计分和发布等阶段默认各 20 分钟。超时后当前运行会标记为 `failed`，不会推进 `latest`。同一周已有运行时，新的触发不会并发启动；超过 30 小时的陈旧运行会先被标记为失败。

## 命令

| 命令 | 说明 |
|------|------|
| `npm run pipeline` | 完整周更：采集 → 抽取 → 标准化 → 分类 → 计分 → 发布 |
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

## 发布产物

- 每周：`leaderboards/{week}/{slug}.json`
- 每周：`leaderboards/{week}/manifest.json`
- 当前：`leaderboards/latest/manifest.json`（发布提交点，短缓存）

前台在 `LEADERBOARD_MANIFEST_URL` 指向 `latest` 路径时，会按当前周推导并读取不可变的周 manifest，避免 mutable `latest` 的 CDN 缓存影响页面更新。

同一周的已验证快照允许通过 `npm run publish -- "Week of YYYY-MM-DD"` 幂等重发，用于修复发布中断；该操作不会重新采集或计分。

首次发布后，将 `latestManifest` URL 配置为 `LEADERBOARD_MANIFEST_URL`。

## 生产检查

运行结果会写入 `pipeline_runs`。检查最新记录：

- `status = success`
- `snapshot_count > 0`
- 生产环境有 `manifest_url`（若已发布）

`data/` 为运行时临时目录（gitignore），审核结果入库后可删除。

## 相关文档

- [data-pipeline.md](./data-pipeline.md) — 管道设计细节
- [review-queue.md](./review-queue.md) — Review Queue 操作说明
- [seo.md](./seo.md) — 技术 SEO 检查与 SEO backlog
