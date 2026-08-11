# Architecture

GEO Radar 将 AI 生成回答转换为可比较的品牌可见度榜单。

## 数据流

```text
AI 回答
  → mention 抽取
  → 品牌规范化与审核
  → 分类与计分
  → 周榜快照（PostgreSQL snapshots = SoT）
  → 前台服务端 builder
  → （可选）Blob / R2 mirror
```

## 组件职责

- PostgreSQL：后台计算、品牌、提及、审核队列、历史记录；**前台可读榜单的唯一真相（snapshots）**。
- Prisma：数据库 schema 和应用侧数据访问。
- Pipeline：采集、抽取、规范化、分类、计分和发布。
- Vercel Blob：可选静态镜像（CDN）；**默认关闭写入**（`PUBLISH_BLOB_MIRROR=1` 才 put）；失败/跳过不否定 DB 快照。R2 未实现（日后仅 mirror）。
- Next.js：渲染首页、分类页、方法论页及 pipeline API。
- Cron：按周触发 pipeline。

用户访问品类榜单时主路径从 `snapshots` 构建（`published-leaderboard` / `leaderboard`）；Blob 不再作为事实主源。周列表由 DB distinct weeks 推导。

## 品牌规范化

规范名和别名优先精确匹配。未匹配的品牌会自动创建并参与当周计分，同时进入 `brand_review_queue`。审核结果从下一周 pipeline 起生效，不重算已经发布的快照。

## 发布与回退

一次 pipeline 会写入 `snapshots` 并记录 `pipeline_runs`。生产健康以运行成功 + `snapshot_count > 0` 为准；`manifest_url` / Blob 镜像为可选。默认不写 Blob；`PUBLISH_BLOB_MIRROR=1` 时 put 失败仍可标记该周对前台可读（`publish_status` 可为 `skipped` / `failed_mirror`）。

## 相关文档

- [数据管道 · 现行实现](./data-pipeline-2026-07-30.md)：legacy 实现细节（B1 前 Blob-first 对照）
- [数据管道 · 架构决策（已定：DB-first）](./data-pipeline-db-primary-2026-08-08.md)：Snapshot 唯一真相
- [数据管道 · B1–B3 可执行落地](./data-pipeline-db-primary-impl-2026-08-08.md)：文件清单与验收（DB-first + Blob opt-in mirror）
- [Getting Started](../ops/setup.md)：环境、本地开发和部署
- [Operations](../ops/operations.md)：周更、Cron、发布和故障处理
- [Review Queue](../ops/review-queue.md)：品牌审核操作
- [Phase 1 PRD](../prd/PRD-phase-1.md)：已实现范围
- [Phase 2 PRD](../prd/PRD-phase-2.md)：已实现范围
- [Phase 3 PRD](../prd/phase-3/PRD-phase-3.md) · [技术文档](../prd/phase-3/technical.md)：当前阶段
