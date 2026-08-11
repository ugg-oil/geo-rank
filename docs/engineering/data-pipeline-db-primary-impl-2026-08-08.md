# 数据管道 DB-first · B1 可执行落地（runbook）

> **文件名日期**：`2026-08-08` = 本 runbook 起草日。  
> **角色**：工程师照单改代码 / 验收；**不是**架构论文。  
> **B1 状态**：读路径 + publish soft-fail 已按 §3 落地；合并前仍跑 §4 验收。  
> **B2 状态**：Brand / movers / history / company / rankings 已对齐 DB published sequence；`brands/*` Blob 为可选镜像。  
> **B3 状态**：默认关闭 Blob 写入；需 `PUBLISH_BLOB_MIRROR=1` 才 mirror。R2 未做。  
> **Why / 否决项 / 事故背景** → [决策文档](./data-pipeline-db-primary-2026-08-08.md)。  
> **Legacy Blob-first 实现细节** → [data-pipeline-2026-07-30.md](./data-pipeline-2026-07-30.md)。

---

## 1. Goal / non-goals

**Goal（B1）**

1. 品类页任意已有 `snapshots` 的 `week`：**主路径从 DB 构建**，不依赖 Blob manifest / 品类 JSON。
2. 周选择器 / 首页等用的周列表：从 `snapshots`（或等价 published sequence）推导，不依赖 `leaderboards/index.json`。
3. `publish`：Blob 不可写（无 token、store blocked、put 失败）时 **仍算发布成功**（以 DB 快照为准）；`manifest_url` 可选。

**Non-goals（本 PR / B1 不做）**

- Brand 页 Blob JSON、`publish-brands` / movers / company index 全面 DB 化 → **B2**。
- 关掉 Blob 写入或迁 R2 → **B3**。
- 改计分公式、采集、schema。
- 现在上 Redis。

---

## 2. Prerequisites

| 项 | 要求 |
|----|------|
| `DATABASE_URL` | 能连生产/预发 Postgres |
| VPN / E-com 数据 | `snapshots` 已有这两品类至少一周（已回填 + launch-gate 通过） |
| Blob | **可 blocked**；B1 验收必须在「无可用 Blob」或故意跳过 Blob 时仍能读榜 |
| FE | P5 slug（`vpn-services`、`ecommerce-platforms` 等）已在 `categories` / 路由；可与 B1 **同发**，勿单独先发仍 Blob-first 的新入口 |
| 本地 | `npm run build` 能过；有一份可用 `.env` |

快速确认 DB 有货（示例）：

```sql
SELECT week, category, COUNT(*) AS rows
FROM snapshots
WHERE category IN ('VPN Services', 'E-commerce Platforms')
GROUP BY 1, 2
ORDER BY 1 DESC, 2;
```

```bash
npm run pipeline:launch-gate -- --category "VPN Services"
# 或你们现有 launch-gate CLI 等价参数
```

---

## 3. B1 checklist（按序）

### B1.1 — DB 任意周构建（晋升今日回退路径）

**Touch**

- `src/lib/leaderboard.ts` — `getAllCategoryLeaderboards` / `getCategoryLeaderboard` 今日只绑 `getCurrentWeek()`；扩展为接受 `week: string`（及 prev via `findPreviousPublishedPeriod`）。
- `src/lib/leaderboard-data.ts` — 若类型/`CategoryBoardsData` 组装有硬编码当前周，一并改。
- `src/lib/period-sequence.ts` — 已有 `findPreviousPublishedPeriod(category, week)`，复用，勿再造日历 −N。

**Change**

- 任意 `week`：从 `snapshots` 拉 Overall + 引擎分榜 + Δ（prev period），再挂 `alsoMentioned` / `periodHighlight`（与 `publish.ts` 的 `buildCategory` 行为对齐或抽共享 helper，避免两套逻辑漂移）。
- 无快照周：返回 `null` / 空，由页面显示 unavailable，**不要**静默读错周 Blob。

**Verify**

```bash
# 本地：不设 LEADERBOARD_MANIFEST_URL，或故意设坏 URL
unset LEADERBOARD_MANIFEST_URL
# 或 LOG_PUBLISHED_LEADERBOARD=1 观察不再依赖 Blob

npx tsx -e '
import { getAllCategoryLeaderboards } from "./src/lib/leaderboard.ts";
const w = "Week of 2026-07-27"; // 换成库里真实周
const d = await getAllCategoryLeaderboards("VPN Services", w);
console.log(d?.week, d?.boards?.overall?.snapshots?.length);
'
```

手动：`/category/vpn-services?week=YYYY-MM-DD` 在无 Blob 时有 Top 20。

---

### B1.2 — `published-leaderboard.ts` 改为 DB-first（Blob 可选）

**Touch**

- `src/lib/published-leaderboard.ts`
  - `getPublishedCategoryLeaderboards`
  - `getPublishedLeaderboardWeeks`
  - （可选）`getPublishedLeaderboardManifest` — B1 可降级为 no-op / 仅调试

**Change**

- **主路径**：调 B1.1 的 DB builder（按 slug→category 映射）；成功即返回。
- Blob：仅当显式 feature flag（若需要）或作为 **可选加速**；默认 **不** 因 `LEADERBOARD_MANIFEST_URL` 存在就优先 Blob。推荐：删掉 / 倒置现有 Blob-first；失败也不应挡住 DB。
- `getPublishedLeaderboardWeeks`：`SELECT DISTINCT week FROM snapshots`（或按「有达标快照的周」过滤），排序取近 N 周（现逻辑 `slice(0, 12)` 可保留）；**禁止**只读 `leaderboards/index.json`。

**Verify**

```bash
# 有/无 LEADERBOARD_MANIFEST_URL 都应列出含 VPN/E-com 的周
npx tsx -e '
import { getPublishedLeaderboardWeeks, getPublishedCategoryLeaderboards } from "./src/lib/published-leaderboard.ts";
console.log(await getPublishedLeaderboardWeeks());
console.log((await getPublishedCategoryLeaderboards("vpn-services"))?.boards?.overall?.snapshots?.slice(0,3));
'
```

---

### B1.3 — 品类页 / 周选择：任意周走 DB

**Touch**

- `src/app/category/[slug]/page.tsx` — 今日：`publishedData ?? (selectedWeek === currentWeek ? getAllCategoryLeaderboards : null)` 会让历史周在 Blob 空时直接 unavailable。
- `src/components/week-selector.tsx` — 确认 weeks 来自 DB 序列（通常只消费 page props，可能无需改）。
- 若首页/榜单入口也拉周列表：`src/app/page.tsx`、`src/components/home-content.tsx`、`src/app/rankings/page.tsx` — 确认走 `getPublishedLeaderboardWeeks`（改完 B1.2 即受益）。

**Change**

- 任意 `selectedWeek`：优先/直接 DB（或统一只调已 DB-first 的 `getPublishedCategoryLeaderboards`）。
- 去掉「仅 currentWeek 才 DB 回退」的限制。

**Verify**

手动：

1. `/category/vpn-services` 与 `/category/ecommerce-platforms` 最新周有榜。
2. 周选择器切到更早有 snapshot 的周，榜变化且不 404。
3. `LEADERBOARD_MANIFEST_URL` 指向坏地址或未设置 → 行为仍正确。

---

### B1.4 — `publish.ts` / pipeline：Blob soft-fail

**Touch**

- `src/pipeline/publish.ts` — 今日 `canPublishToBlob()` false 直接 `throw`；put/verify 失败会使 publish 失败。
- `src/pipeline/run.ts` — `publishStatus` / `manifestUrl` 写入。
- `src/lib/pipeline-health.ts` — 今日成功硬条件含 `manifestUrl` / `latestManifestUrl` / `publishStatus === "success"`。
- `src/scripts/check-pipeline-health.ts`（若有）— 与 health 对齐。
- `docs/ops/operations.md` — 「生产检查」里 manifest 硬条件改为可选（B1 合并时改措辞）。

**Change**

- Blob 不可用或 put/verify 失败：记日志 / `publishStatus = "skipped" | "failed_mirror"`（命名自定），**不**让整个 pipeline `status` 失败（前提：`snapshot_count > 0` 且计分完成）。
- `manifest_url` / `latest_manifest_url`：可 null；**成功定义** = DB 快照已写入且发布门槛满足（与既有引擎有效率规则一致）。
- `pipeline-health`：以 DB 发布序列 + `pipeline_runs.status` + `snapshot_count` 为主；Blob 校验降级为 warning。

**Verify**

```bash
# 无 Blob token / store blocked 时：
npm run publish -- "Week of YYYY-MM-DD"
# 期望：exit 0（或明确 soft-fail 仍标周可读）；snapshots 不变坏
# pipeline_runs：status=success（或等价），manifest_url 可为 null

npm run pipeline:health
# 期望：不以缺 manifest 判红
```

---

### B1.5 — 回归冒烟（最小）

**Touch（通常只跑，不改）**

- `npm run lint` / `npm run build`
- 现有：`npm run pipeline:period`、`pipeline:also-mentioned`、`pipeline:period-highlight`、`pipeline:quadrant`（若依赖周序列，确认仍绿）
- 可选加短脚本：`verify-published-weeks-from-db.ts`（非必须，手测也可）

**Verify**

```bash
npm run build
# 手动点：首页 → 品类 → 切周；VPN / E-com 不空
```

---

## 4. Acceptance criteria（B1）

| # | 标准 | 过线方式 |
|---|------|----------|
| A1 | 配置了坏的 / 未配置 `LEADERBOARD_MANIFEST_URL` 时，有 snapshot 的品类页仍出榜 | 手测 + 可选脚本 |
| A2 | `/category/vpn-services`、`/category/ecommerce-platforms` 可读（至少最新有数据周） | 手测 / 预发 |
| A3 | `?week=` 切到任意有 `snapshots` 的周可读；无数据周明确 unavailable | 手测 |
| A4 | 周列表含 DB 中已发布周，不因 Blob `index.json` / `latest` 缺 P5 而丢掉 | 对比 SQL distinct weeks vs UI |
| A5 | `npm run publish` 在 Blob blocked / 无 token 时不阻断「周对前台可读」；health 不以缺 manifest 为硬失败 | CLI |
| A6 | `npm run build` 通过 | CI / 本地 |

未过线不合并；过线后再恢复 P5 公开推进（见决策文档 §D）。

---

## 5. Deploy order（B1 + P5 FE）

```text
1. 合并并部署 B1（DB-first 读路径 + publish soft-fail）
2. 同发或紧随：含 P5 slug / 入口的 FE（categories、nav、SEO）
3. 验证生产：VPN / E-com 品类页 + 切周
4. 再恢复其余 P5 采集 / backfill（publish→Blob 非门禁）
```

**禁止**：Blob-first 未改 + `latest` 仍缺 VPN/E-com 时，单独上线「新 slug 入口」（易 404 或空榜）。理由见 [决策文档 §A.3 / §D](./data-pipeline-db-primary-2026-08-08.md)。

---

## 6. B2 / B3（短清单）

细节与「为什么」见 [决策文档 §D](./data-pipeline-db-primary-2026-08-08.md)。此处只列执行指针。

### B2 — Brand / movers / history / rankings 对齐 DB 序列

| 区域 | 文件（起点） | 做什么 |
|------|----------------|--------|
| Brand 页 | `src/app/brand/[slug]/page.tsx`、`src/lib/brand-page.ts`、`src/lib/brand-page-build.ts`、`src/lib/brand-excerpts.ts` | ✅ 主读离开 `brands/*` Blob；周序列同 B1；excerpts 在 `buildBrandPages` 内从 responses 选 |
| History / enrichment | `src/lib/brand-history.ts`、`brand-enrichment.ts` | ✅ 消费 DB weeks + DB boards（经 `getPublished*`） |
| Movers | `src/lib/biggest-movers.ts` | ✅ 同上 |
| Company | `src/lib/company-page.ts`、`publish-companies.ts` | ✅ index/详情 DB-first；Blob soft-fail |
| Publish brands | `src/pipeline/publish-brands.ts` | ✅ 镜像可选；put 失败不抛 |
| Rankings 聚合 | `src/app/rankings/page.tsx` | ✅ 已走 DB-first API（B1） |

**验收粗标**：断 Blob 时 brand / movers / rankings 仍合理；无半边 Blob 半边 DB。

### B3 — 降级 Blob；仅必要时 R2 mirror

| 任务 | 说明 |
|------|------|
| 确认无流量依赖 Blob-first | ✅ 品类 / brand / weeks 主读 DB-first（B1/B2） |
| 收缩或默认关闭 publish-to-Blob | ✅ `PUBLISH_BLOB_MIRROR=1` opt-in；`blob-publish.ts` / `publish.ts` / brands / companies |
| （可选）R2 仅 mirror | **未实现**；禁止再当 SoT；见决策文档否决表 |

---

## 7. 相关文档

| 文档 | 用途 |
|------|------|
| [data-pipeline-db-primary-2026-08-08.md](./data-pipeline-db-primary-2026-08-08.md) | 决策、事故、目标架构、B1–B3 为何 |
| [data-pipeline-2026-07-30.md](./data-pipeline-2026-07-30.md) | Legacy MVP 实现细节（计分、模型、Blob 路径） |
| [architecture.md](./architecture.md) | 系统边界；B1 合并后更新「前台主读」措辞 |
| [operations.md](../ops/operations.md) | 运维命令；B1 后改成功判定 |
