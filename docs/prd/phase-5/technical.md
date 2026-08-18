# Phase 5 技术文档

> 对应需求：[PRD-phase-5.md](./PRD-phase-5.md)（v1.5 · 已发布）。本文只写实现、数据源、组件与验收细节。

## 1. 范围与文件

| 需求块 | 主要触点 |
|--------|----------|
| P0 首页 | `src/app/page.tsx`、`src/components/home-content.tsx`、`src/components/biggest-movers.tsx`、`src/lib/biggest-movers.ts`、`src/lib/period-highlight.ts` |
| P1 榜单页 | `src/app/rankings/page.tsx`、`src/components/rankings-content.tsx`、`src/lib/published-leaderboard.ts`（`getCategoryCardLeaders` 等） |
| P2 品类排行页 | `src/app/category/[slug]/CategoryBoard.tsx`、Also mentioned 组件 / i18n |
| P3 品牌详情页 | `src/components/brand-page-content.tsx`、`src/components/brand-evidence-details.tsx`、`src/lib/brand-page-build.ts` |
| P4 公司页 | `src/app/company/[slug]/page.tsx`、`src/components/company-page-content.tsx`、`src/lib/company-page.ts` |
| P5 品类扩展 | `constants.ts` / `categories.ts` / `category-cards.ts` / `category-period.ts`、`seed-prompts.ts`、i18n、entity-audit exclude、`backfill:categories`、`pipeline:launch-gate` |

全站：

- 品类列表同源：`CATEGORIES` / `CATEGORY_CARDS` / i18n `categories`；禁止首页再维护独立 `CATEGORY_SHORTCUT_SLUGS`。
- 话术：period / `YYYY-MM-DD`；禁止 week / Weekly（含 i18n）。首页不展示单一全局 latest。
- 页内 week 与榜 / 摘录 / history / Δ 同源；Δ 复用 `getRankDelta`。

## 2. P0 · 首页

### 2.1 Top 5（P0-1）

- 默认 slug：`ai-tools`；最新已发布 Overall Top 5。
- 卡上标明该品类周期起始日（该品类 week key，非整站 manifest.week）。
- CTA → `/category/ai-tools`。

### 2.2 Movers（P0-2）

- `getBiggestMovers`；品牌 → `/brand/{slug}`；品类名单独链 → `/category/{slug}`。
- `#prev → #curr` + 放大 `spots`；压缩与下一块间距。

### 2.3 Period Insights（P0-3）

- 无 LLM。模板：movers 最大上升 / 可选 NEW；或 `selectPeriodHighlight` 在 1–2 热门品类。最多 2–3 条；0 条不渲染。

### 2.4 Hero 右侧卡（P0-4）

| 字段 | 数据源 |
|------|--------|
| 引擎数 | `COLLECTION_ENGINES.length` 或 manifest `scoringEngineUnion` |
| prompts | `weeklyPromptCount()` / manifest `promptCount` |
| 品类数 | `CATEGORIES.length` |
| Most visible | 可选：默认品类 Overall #1 |
| Biggest mover | movers 中 spots 最大 riser；无则隐藏 |

### 2.5 Categories we track（P0-5）

- 由 `CATEGORIES` 生成 +「View all」→ `/rankings`；删硬编码 shortcut。

## 3. P1 · 榜单页

### 3.1 卡片（P1-1）

- #1 文案去掉「this period / 本周期」；例 `#1 · {name}`。
- Top 3：扩展 `getCategoryCardLeaders`（或等价）一次查 rank 1–3 的 name+score。
- #1 → Brand（内层 Link / 拆可点区）；主体 → Category。左侧序号仅为 UI。

### 3.2 筛选（P1-2）

- 过滤 `cat.name` / `cat.short`；无匹配空态。
- 无快照：不可点或淡出。

## 4. P2 · 品类排行页

### 4.1 表排序 + Tooltip（P2-1）

- `sortKey: "score" | "appearanceRate" | "avgRank" | "modelCoverage"`，默认 `score`。
- `avgRank` 升序，其余降序；`#` 列仍是发布 `row.rank`；coverage 仅 overall。
- 表头 `?` Tooltip（EN/ZH）；avgRank / coverage 必写清。

### 4.2 对比（P2-2）

```text
行 checkbox → selected max 3
n>=2 → sticky「对比 (n/3)」
Modal 并排表
```

| 行 | 最优 |
|----|------|
| score / appearanceRate / modelCoverage | max |
| avgRank | min |
| 引擎 Tab | 隐藏 coverage 行 |

无新 API；URL 不要求 `?compare=`。

### 4.3 Also mentioned（P2-3）

- `alsoMentionedLead(periodStart)`；日期 = 页头当前周期 `YYYY-MM-DD`。

### 4.4 象限（P2-4）+ 位移（P2-5）

- 基座已有 X=`appearanceRate`、Y=`avgRank`、中位分象限。
- 命名：Leaders / Challengers / Niche / Laggards（ZH：领导者 / 挑战者 / 利基 / 落后）。
- 颜色区分；tooltip/点选 → Brand；引擎 Tab 不换图。
- 位移：当前 + 上一已发布 overall 的 appearance/avgRank；淡点+实点+箭头；并集 scale；中位用本周期；无上期隐藏。

## 5. P3 · 品牌详情页

### 5.1 Why（P3-1～P3-2）

- `<details open>`；旁注 `basedOn` = `基于 {YYYY-MM-DD}` / `Based on {YYYY-MM-DD}`。
- `buildWhyCards`（`src/lib/brand-why.ts`）替换 `whyBody`：
  - 锚定 = `from` ∩ categories，否则 min(rank)；一行 rank/score/mention 摘要。
  - 优势：engines rank 前 1–2，或优于 overall ≥2 位。
  - 弱点：collected 无 snapshot →「几乎不提」；有则最差 1–2。接近：max−min ≤2 且无缺失 →「各引擎接近」。
  - 趋势：`computeTrendLabel`；无点隐藏。

### 5.2 推荐原文（P3-3）

- 外层默认展开；按引擎分组；默认第一个有摘录引擎；全部展开/收起；`groups.length === 0` 不渲染。

### 5.3 品类卡（P3-4）

- `from` 置顶；`prevRank`/`hasPrevPeriod` 来自 `findPreviousPublishedPeriod`；引擎徽章 → `?engine=`。

### 5.4 Similar / CTA / 空态（P3-5）

- Similar 标题「同品类相近排名」+`#rank`；无邻居隐藏；Lead 文案监测可见度；`categories.length === 0` → `/rankings`。

### 5.5 历史图（P3-6）

- 起止 `<select>`；默认全范围；起晚于止则钳制；两图共用；过滤后不足 2 点空态。

## 6. 验收清单（工程）

- [x] 无 week 话术回归；品类列表只改一处
- [x] Top 5 / Top 3 / movers / insights / 空态降级不报错
- [x] 表排序不破坏 Δ；coverage 仅 Overall；对比 2–3 限制
- [x] Also mentioned / Why 日期与页头周期一致
- [x] 象限位移跟页头周期；无上期隐藏
- [x] Brand：Why/原文默认展开；三卡；from 置顶；Δ；引擎链；空态；历史起止
- [x] Company：摘要；排序+from 置顶；品类行 Δ；空态
- [x] P5：`P5-n` / `P5-n-1` + 临近 4 档×6 引擎已齐（含 DeepSeek `*-6`）；P5-12 launch-gate 四档全绿（2026-08-16）；边界见 §8.5

## 7. P4 · 公司页

- 触点：`company-page-content.tsx` / `company-page.ts` / `company-page-view.ts`。
- P4-1：摘要（产品数 / 品类去重 / 最佳名次 / 可选最大上升）；0 产品不渲染 + `/rankings` 空态。
- P4-2：`sortKey: "rank" | "score" | "category"`；from brand 置顶；品类行 Δ。
- 验收：`npm run pipeline:company-page`。

## 8. P5 · 品类扩展（11）

> 需求条目见 [PRD-phase-5.md](./PRD-phase-5.md) P5。本节写实现、回填与编号映射。

### 8.1 编号映射

```text
P5-n          新增品类（配置）
P5-n-1        Prompt×8 + seed
P5-n-2..5     补周期数据：08-10 / 07-27 / 07-13 / 06-29
P5-n-p-1..6   该周期单引擎：ChatGPT / Gemini / Grok / Perplexity / Claude / DeepSeek
P5-12         全局约束：Brand Page / exclude 本品类 / 列表同源 / launch-gate / publish
```

引擎序 = `COLLECTION_ENGINES`：`chatgpt` → `gemini` → `grok` → `perplexity` → `claude` → `deepseek`。

### 8.2 触点文件

| 步骤 | 触点 |
|------|------|
| 品类注册 | `src/lib/constants.ts`（`CATEGORIES`）、`categories.ts` / slug map、`category-period.ts`、`category-cards.ts`、i18n EN·ZH |
| Prompt | `src/scripts/seed-prompts.ts` → `npm run seed`；正文同步 [category-selection.md](../category-selection.md) |
| exclude | `entity-audit` `excludedCategories`（仅本品类） |
| 回填 | `npm run backfill:categories`（`--execute` 才采；追加 ` as of YYYY-MM-DD`；本批曾 `--skip-engines=deepseek`） |
| Company 列 | `src/lib/parent-company.ts` curated map（P5 产品已扩） |
| 门槛 | `npm run pipeline:launch-gate` |
| 发布 | publish；category-selection 状态 →「已发布」；首页/rankings 只改配置源一处 |

### 8.3 回填口径

> **2026-08-15**：本批先执行 `backfill:categories --execute --all-new --periods=4 --skip-engines=deepseek`；Company 列 curated map 已扩至 P5 产品（`src/lib/parent-company.ts`）。
>
> **2026-08-16**：DeepSeek 单引擎补跑完成（`--force --periods=4 --skip-engines=chatgpt,gemini,grok,perplexity,claude`）；`P5-n-*-6` 已勾。

上线要齐的是 **含当前周期在内的临近 4 档**（不是「剔掉当前再倒推 4 档」）。

- 周期起点：`getPeriodStartDate(periodDays)` + epoch 对齐（`src/lib/period.ts`）。
- prompt 追加 ` as of {periodStartDate}`（`YYYY-MM-DD`）；不用 `Week of` / 月级锚定。
- 回填当普通历史（Δ/NEW/看点/Also mentioned/Layer B/趋势照常）；前台不披露伪历史。
- 不覆盖已有快照除非显式重跑。更老于临近 4 档的历史可留库，但 **不算完成条件**。

基准日：**2026-08-14**。本批全 **14 天**；当前周期 **2026-08-10**。

| 周期 | 临近 4 档（近→远，含当前） | PRD 子编号 |
|------|---------------------------|------------|
| 14 天 | `08-10` · `07-27` · `07-13` · `06-29` | `P5-n-2` · `P5-n-3` · `P5-n-4` · `P5-n-5` |

单引擎勾选：`P5-n-p-e` = 该周期该引擎有效 response 齐（≥ prompt 条数，见 launch-gate）。

### 8.4 配置步骤（对应 `P5-n` / `P5-n-1`）

1. `CATEGORIES` + slug + `CATEGORY_PERIOD_DAYS` = 14 + cards + i18n。
2. 写 8 条 Prompt（钉口径，避免飘回已有大品类）。
3. exclude / watchlist 写入 entity-audit（需要时）。
4. `npm run seed`。
5. 干跑 → 按周期×引擎回填 → launch-gate → publish。

### 8.5 边界实现注意

- **HR（P5-10）**：口径 = HRIS/人事主数据；Recruiting = ATS；两侧 exclude 互斥母名，避免双榜互吞。Recruiting 侧已 exclude Workday/BambooHR/ADP/SAP SuccessFactors/UKG；HR 侧已 exclude Greenhouse/Lever/Ashby/Workable/Jobvite/SmartRecruiters/iCIMS（`entity-audit.ts`）。
- **Email Marketing（P5-9）**：Prompt 钉邮件/生命周期，避免飘回 Marketing Tools。
- **Design（P5-7）**：排除纯 AI image/video 生成器（归 AI Image/Video）。
- **SEO（P5-5）**：排除泛 Marketing 套件母名（无独立 SEO 产品时）。

### 8.6 launch-gate（P5-12）

> **2026-08-16**：`yarn pipeline:launch-gate -- --all-new` 对 `08-10` · `07-27` · `07-13` · `06-29` 均为 `allOk: true`（≥30 候选、≥3 引擎、Top20 无越界）。列表同源：`CATEGORIES.length === CATEGORY_CARDS.length`（24）。Brand Page：overall snapshot → `getBrandPageBundle` 可读。
