# Operations

周更管道、发布、Cron 与 Review Queue。环境配置见 [setup.md](./setup.md)。

## 周更流程

```bash
npm run pipeline
npm run review:auto -- --apply
```

Pipeline 完成后默认**不**写 Vercel Blob。仅当显式设置 `PUBLISH_BLOB_MIRROR=1`（且具备 `BLOB_READ_WRITE_TOKEN` / `BLOB_STORE_ID`）时，才将榜单镜像到 Blob（`leaderboards/*`、`brands/*`、`companies/*`）。**前台主读 PostgreSQL `snapshots`（DB-first）**；Blob 为可选镜像，跳过或失败不否定该周对前台可读。

Pipeline 具有明确的超时边界：单次 OpenRouter 请求默认 45 秒，采集和抽取阶段默认各 20 分钟，规范化、分类、计分和发布等阶段默认各 20 分钟。超时后当前运行会标记为 `failed`，不会推进错误发布。

**生产 Cron 为步进式（防 Vercel 单次请求被掐死）：** `/api/cron` 每次推进一个单位。采集阶段按**品类软截止**：单个 tick 预算默认 240s（`PIPELINE_TICK_BUDGET_MS`，低于路由 `maxDuration=300`），超时后留在同一 `collecting:<engine>`，下一枪/自链继续，而不是把整次 run 标 failed。每品类凑够 ≥3 个完整引擎后**先 extract/score 发综合榜**，然后同一条 run（或 catchup 新开的尾部 run）继续采剩下的引擎；**每采完一家就强制重打分发榜**，Perplexity/Claude 不必等 DeepSeek。extract 只处理还没有 mentions 的 response，tick 预算用尽就停在 `extracting`，下一枪续跑，不再一把梭被 300s 掐死。后处理（extract→publish）在同一 tick 预算内能跑几步跑几步（再开下一阶段需剩余 ≥ `PIPELINE_POST_STAGE_PACK_MIN_MS`，默认 20s），减少对 `after()` 自链的依赖。写回 `current_step`；采集按 prompt、extract 按 response、score 按品类刷新 `updated_at` 心跳（10s 节流）。同一请求可用 `after()` 自链式续跑（深度上限 24）；`vercel.json` 周一 UTC 02:00–04:30 错峰再触发。本地 `npm run pipeline` 仍是一次性跑完全流程（采集用 20 分钟硬超时）。

**补跑兜底（`/api/cron/catchup`）：** 周一主窗口只有 2.5h；DB/平台故障盖住窗口时不能干等到下周一。Hobby 套餐 Vercel Cron **不能按小时调度**（会直接让部署失败），因此拆成两层：

- **Vercel**：每天 UTC `06:00` 打一次 catchup（Hobby 合规的日级兜底）
- **GitHub Actions**（`.github/workflows/pipeline-catchup-5m.yml`）：每 **5 分钟** **短请求触发**同一路由（`curl --max-time 25`，不等待 tick 跑完；504/超时也算触发成功）。这是续跑的主调度；`after()` 自链在 Hobby 上只是尽力而为。仓库需配置 secret `CRON_SECRET`（与 Vercel 相同），可选 variable `SITE_URL`（默认 `https://georadar.website`）

入口策略见 `src/lib/cron-catchup-policy.ts`（入口只读最新 `pipeline_runs` 一行，不扫 prompts/responses/snapshots）：

1. 最新 run `success` 且 `snapshotCount > 0`，且 6 个采集引擎都采完 → `already_published`。综合榜已发但还有引擎没采完 → **继续采下一家**，采完就 extract/score/publish，再采下一家。
2. 最新 run 心跳 < 5 分钟 → `already_running`（不与活自链打架）
3. 心跳 5 分钟–90 分钟的 `running` → **续跑**（避免干等到 90 分钟才 stale）
4. 将新建/重挂 run 时，若本周 `pipeline_runs` 已 ≥ 6 → `circuit_open`，发告警后停手（防结构性缺口无限烧 API）
5. 否则 tick + 自链

完整 `getPipelineHealth`（coverage 扫描）只在 tick 报告 `done` 之后跑，避免 GHA `curl --max-time 25` 在闸门上把还没开始的 tick 掐掉。

健康门禁：本周期已有 snapshots、应跑品类均有 Overall Top20、每品类至少 3 个引擎完成全部 active prompts。最新 run 仍在采尾部引擎时 health 仍 ok，带 `tail_collection_in_progress` warning。Blob 缺失只 warning。周一 `/api/cron` **不走**熔断（主跑优先）。自链 `x-pipeline-chain-depth > 0` 跳过入口闸门。周中 period 与周一等价；`collectOne` 对已 `ok` response skip。

陈旧 `running` 判定看 **心跳**（`updated_at`），默认 **90 分钟**无更新即标 failed（可用 `PIPELINE_RUN_STALE_TIMEOUT_MS` 覆盖；不再用 30 小时）。
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

生产为**步进 tick**（非一次跑完全程）。采集一次推进一个引擎（软预算内）；后处理同一 tick 能跑多步。响应里 `done: false` 时会尝试 `after()` 自链。

```bash
curl "https://georadar.website/api/cron" \
  -H "Authorization: Bearer $CRON_SECRET"
```

`vercel.json` 另有周一 UTC 错峰多次触发（02:00–04:30），即使自链被平台掐断也能续跑。路由 `maxDuration = 300`。

鉴权失败返回 `401 Unauthorized`。

### Cron 补跑（catchup）

- Vercel：每天 UTC `06:00`
- GitHub Actions：每 5 分钟（`Pipeline catchup 5m` workflow；可在 Actions 页手动 `workflow_dispatch`）。workflow **只负责触发**（25s curl 上限），不等待 Vercel 跑完；平台 504 不算配置失败。活租约 5 分钟内会 skip，避免和正在跑的 tick 打架。

策略摘要：健康 / 5 分钟内活租约 → no-op；冷 `running` → 续跑；将新建且本周 run ≥ 6 → `circuit_open`；否则等同 `/api/cron` tick + 自链。手动跑法：

```bash
curl "https://georadar.website/api/cron/catchup" \
  -H "Authorization: Bearer $CRON_SECRET"
```

可能返回：`skipped: "already_published" | "already_running" | "circuit_open"`。

**GitHub 配置（一次性）：** Settings → Secrets and variables → Actions → New repository secret：`CRON_SECRET` = 与 Vercel 环境变量同名同值。可选 Variables：`SITE_URL=https://georadar.website`。

### 健康检查

```bash
curl "https://georadar.website/api/pipeline-health?week=Week%20of%202026-08-03" \
  -H "Authorization: Bearer $CRON_SECRET"
```

健康要求：最新 run `success`、`snapshot_count > 0`、本周期应跑品类 Overall Top20 齐全、每品类 ≥3 个完整引擎。Blob manifest 缺失只 `warnings`。不健康返回 `503`（可带 `coverage`）。

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
