# 数据管道架构决策：Snapshot 唯一真相（已定）

> **文件名日期**：`2026-08-08` = 本决策记录日。  
> **决策已定**：PostgreSQL `snapshots`（及派生 builder）为前台可读唯一真相；Blob / R2 仅可选缓存或镜像，不再充当事实主源。  
> **状态**：按此实现。**B1 / B2 / B3 已落地代码**：品类与 brand 读路径 DB-first；publish 默认**不**写 Blob（`PUBLISH_BLOB_MIRROR=1` 才镜像）；R2 未实现（日后仅 mirror，永不 SoT）。  
> **对照**：[data-pipeline-2026-07-30.md](./data-pipeline-2026-07-30.md) — legacy Blob-first 实现说明（历史对照）。  
> **可执行落地（runbook）**：[data-pipeline-db-primary-impl-2026-08-08.md](./data-pipeline-db-primary-impl-2026-08-08.md) — B1–B3 文件清单、验收与部署顺序。

相关代码锚点（实现时勿绕开）：

| 区域 | 文件 / 环境变量 |
|------|-----------------|
| 前台读榜 | `src/lib/published-leaderboard.ts`（DB-first；`LEADERBOARD_MANIFEST_URL` 仅可选元数据） |
| DB 回退 / 周内构建 | `src/lib/leaderboard.ts`、`src/lib/leaderboard-data.ts` |
| 发布写 Blob | `src/pipeline/publish.ts`、`publish-brands.ts`、`canPublishToBlob` — **默认跳过**；需 `PUBLISH_BLOB_MIRROR=1` + `BLOB_READ_WRITE_TOKEN` / `BLOB_STORE_ID` |
| 派生面板 | `also-mentioned.ts`、`period-highlight.ts`、`brand-excerpts.ts`、`competition-quadrant.ts` |
| 真相表 | Prisma `snapshots`；运行记录 `pipeline_runs`（含可选 `manifest_url`） |

---

## A. 背景 / 事故记录（2026-08）

### A.1 Vercel Blob Advanced Ops 超额 → Store 阻塞

- 生产 Blob 用量触及 Advanced Ops 配额（约 **2.3K / 2K**），store 进入 blocked / 不可写状态。
- 直接后果：`npm run publish` / pipeline 发布阶段无法可靠写入 `leaderboards/*`、`latest/manifest.json`、品牌 JSON 等；现行实现里「发布成功」的判定（`pipeline_runs.manifest_url`、健康检查读公开 manifest）失效或误报。
- **不应**在 store 仍 blocked 时强行全量 Blob 重发（见 §G）。

### A.2 双真相：DB 有数据，Blob `latest` 丢品类

- VPN Services、E-commerce Platforms 等 P5 品类已在 PostgreSQL 完成回填（`snapshots` 有周/品类行），并通过 launch-gate 等校验。
- 发布失败、读空 / 不完整 rewrite、或 `latest/manifest.json` 被写成「不含新 slug 的旧集合」后，Blob 侧「已发布品类集合」与 DB 漂移。
- 前台在配置了 `LEADERBOARD_MANIFEST_URL` 时走 `getPublishedCategoryLeaderboards` / `getPublishedLeaderboardWeeks`：**以 Blob manifest / index 为优先真相**，DB 回退只在 fetch 失败或 week mismatch 等路径触发——因此会出现「库里有榜、线上读不到 / 周列表缺品类」的不一致事故。
- 同类风险此前已在周更事故中出现过（immutable 周文件 vs `latest` 覆盖、CDN 缓存）；见 [2026-08-03 weekly pipeline incident](../incidents/2026-08-03-weekly-pipeline-incident.md)。本次是配额阻塞 + 双 SoT 放大同一类问题。

### A.3 生产 FE 404（新 P5 slug）——与 Blob 正交

- 新品类路由 / 入口若未随 FE 部署上线，生产会对 `/category/{slug}` 等返回 404。
- 这与 Blob store blocked **无关**：即使 Blob 恢复，未部署的 slug 仍 404；即使 DB-first 落地，也必须先（或同时）部署含 P5 路由与入口的 FE。
- **部署顺序约束**：见 §E — 不要在 Blob-first + broken `latest` 上单独推仍依赖 Blob 的 FE。

### A.4 P5 进度（截至本决策）

- VPN Services、E-commerce Platforms：**已回填 + gated**；其后 **暂停**（不再继续全量 Blob publish / 其余 P5 采集发布），待 B1（及合理部署顺序）后再推进。
- 其余 P5（Course / Language / Password / Meeting / Cyber / Recruiting）配置与 seed 多已就绪，公开数据路径仍依赖「可发布的真相源」——当前不应以 Blob 为前置条件。

---

## B. 问题本质

1. **角色漂移**：现行实现里 Blob 本是「发布产物 / CDN 静态读」；实现与运维逐渐把 `LEADERBOARD_MANIFEST_URL`、`latest/manifest`、`index.json` 当成**品类是否存在、哪一周可看**的事实主源。
2. **双 Source of Truth**：`snapshots`（及 `pipeline_runs`）与 Blob 树并行「权威」。任一端写失败、部分成功、CDN 陈旧、或 quota 阻塞，都会造成 silent inconsistency，且排障要同时查 DB + Blob + 缓存头。
3. **配额与运维耦合**：前台正确性绑在 Blob Advanced Ops / 写入配额上；扩品类（P5→50–100）会放大 put/list/ops，而真正的规模瓶颈应是 **Collect / LLM 成本**，不是 Postgres 读 Top 20 快照。

**因此已定**：把 **immutable 的计算快照（DB `snapshots`）** 定为唯一真相；静态对象存储最多做可选加速层。下列路径明确否决，不作为备选：

| 否决项 | 理由（简述） |
|--------|----------------|
| **继续 Blob-first 当 SoT** | 双真相已导致事故；扩品类只会放大配额与漂移。文档见 [现行实现说明](./data-pipeline-2026-07-30.md)，仅作 legacy 对照。 |
| **Upgrade-only（抬 Vercel / Blob 配额）** | 可救急恢复写入，**不消除**双 SoT；扩品类后仍会撞墙。 |
| **R2（或其它桶）仍作静态主读 / SoT** | 可降本，但若仍以 object manifest 为真相，只是换桶的 Blob-first。桶角色最多 mirror，不得再当 SoT。 |

---

## C. 目标架构

```text
snapshots (immutable SoT)
  → server builders
       (alsoMentioned, periodHighlight, brand excerpts, …)
  → Next.js cache（必要时再上 Redis）
  → optional Blob / R2 mirror（CDN 加速，可丢可重建）
```

### C.1 真相与派生

- **SoT**：`snapshots` 行（`week` / `category` / `engine` / `brand_id` / score 字段 / `rank`）。周是否「已发布可展示」由 DB 中是否存在达标快照（及既有发布阈值逻辑）决定，**不以** Blob `latest/manifest` 有无为准。
- **周列表 / latest**：由 `snapshots` distinct week（或 `pipeline_runs` 成功且 `snapshot_count > 0` 的序列）推导；`getPublishedLeaderboardWeeks` 一类 API 最终应离开 `leaderboards/index.json` 主依赖。
- **Builders**：`also-mentioned.ts`、`period-highlight.ts`、`brand-excerpts.ts` 等在服务端由快照（+ 必要关联表）组装；与是否成功 `blobPut` 解耦。
- **Optional mirror**：`publish.ts` 仍可写 Blob/R2，失败记日志 / 指标，**不**回滚或否定 DB 快照；健康检查应以 DB 发布序列为主，Blob 校验降级为「镜像延迟」告警。

### C.2 规模判断

- 品类到 50–100：主要成本是 **OpenRouter 采集 + 抽取**，不是 Postgres 按品类读 Top 20。
- 过早上 Redis、或把「全站静态 CDN」当扩品类前置，属于优化错层（见 §F）。

---

## D. 落地阶段

> **动手改代码**：按序 checklist、文件清单、验收 → [impl runbook](./data-pipeline-db-primary-impl-2026-08-08.md)。本节只保留阶段意图。

### B1 — 品类任意周从 DB 读；周列表从 snapshots；publish 不依赖 Blob 成功

- 品类页任意 `week`：主路径走 DB 构建（今日回退路径晋升为主路径），`published-leaderboard.ts` 的 Blob-first 改为可选或关闭。
- `getPublishedLeaderboardWeeks`（及首页 / rankings 用到的周序列）基于 `snapshots`（或等价 published sequence），不依赖 `index.json` / `latest` 完整性。
- `publish.ts`：Blob 不可用（无 token、store blocked、put 失败）时，**仍可**标记该周/品类对前台可读（以 DB 为准）；`manifest_url` 变为可选元数据，不再是「成功」硬条件。
- **部署顺序**：B1 **先于或与** 含 P5 slug 的 FE 一同上线；**禁止**在 `latest` 仍缺 VPN/E-com、且 FE 仍 Blob-first 时单独部署「新 slug 入口」（易 404 或空榜）。

### B2 — Brand / movers / history / rankings 对齐 DB 发布序列

- Brand excerpts、biggest movers、历史序列、排行聚合等，统一消费与 B1 相同的「已发布周 / 品类」序列（DB），避免一半读 Blob `brands/*`、一半读 DB。
- `publish-brands.ts` 镜像同上：可选；失败不挡品牌页主读。
- **状态（2026-08-08）**：读路径已 DB-first（`brand-page-build` / `getBrandPagesForWeek`）；Blob brands/companies 写入 soft-fail。

### B3 — 降级或退役 Blob；仅在仍要静态 CDN 时考虑 R2

- **状态（2026-08-08）**：默认关闭 publish-to-Blob。`canPublishToBlob()` 要求 `PUBLISH_BLOB_MIRROR=1` **且** 有写凭证；否则 `publish_status=skipped`，日志 `Blob mirror skipped`，不调用 `put`。
- R2：**未实现**；若日后需要全球静态加速，仅作 mirror，**禁止**再当 SoT。
- 确认无流量依赖 Blob-first：品类 / brand / weeks 主读已 DB-first（B1/B2）。

### 与 P5 的衔接

1. B1（+ 必要 FE）就绪后，再恢复 P5 公开上线（VPN / E-com 已有 DB 数据可先挂）。
2. 其余 P5 继续 `seed` → `backfill:categories` → launch-gate；**publish 到 Blob 非门禁**。
3. 在 store blocked 期间，抬配额仅当需要紧急镜像或排障；不作为继续 P5 的架构前提。

---

## E. 文档关系

| 文档 | 角色 |
|------|------|
| [data-pipeline-2026-07-30.md](./data-pipeline-2026-07-30.md) | **现行实现说明（legacy）**：MVP / 当前默认实现细节（模型、计分、Blob 路径、`LEADERBOARD_MANIFEST_URL`）。B1 前仍可能与代码一致；保留作实现细节与历史对照，**不是备选方案**。 |
| **本文** | **已定架构决策与阶段计划**：事故驱动、目标态、B1–B3 为何。按此实现。 |
| [data-pipeline-db-primary-impl-2026-08-08.md](./data-pipeline-db-primary-impl-2026-08-08.md) | **可执行落地 runbook**：B1–B3 改哪些文件、怎么验、部署顺序。 |
| [architecture.md](./architecture.md) | 系统边界总览；应随 B1 落地更新「前台主读」表述。 |

**在 B1 合并前**：排障看 [现行实现说明](./data-pipeline-2026-07-30.md)（实际代码路径）与本文（已定约束：不要再强化 Blob SoT）；动手改代码跟 [impl runbook](./data-pipeline-db-primary-impl-2026-08-08.md)。

---

## F. 明确不做 / 暂缓

| 项 | 原因 |
|----|------|
| **现在上 Redis** | 无证据表明 DB 读快照是瓶颈；过早引入第二缓存层。Next cache 足够撑过 B1/B2。 |
| **以全量迁 R2 作为继续 P5 的前置** | 换桶不消除双 SoT；拖慢 VPN/E-com 已就绪数据的上线。 |
| **在 store blocked 时强行全量 Blob publish** | 配额/阻塞下重试只会制造更多失败 ops 与半写入 manifest；应等 B1 或配额救急后再 mirror。 |
| **把「升级 Vercel」当长期架构** | 只救急，不替代 Snapshot SoT。 |

---

## 决策摘要

- **已定**：`snapshots` = 唯一真相；Blob/R2 optional mirror。
- **实现从 B1 开始**；B1 合并前生产代码仍可能是 Blob-first。
- [data-pipeline-2026-07-30.md](./data-pipeline-2026-07-30.md) 保留为现行实现 / 历史对照，直至运行时与本文对齐后再改 architecture / ops 措辞。
- 具体改文件与验收见 [impl runbook](./data-pipeline-db-primary-impl-2026-08-08.md)。
