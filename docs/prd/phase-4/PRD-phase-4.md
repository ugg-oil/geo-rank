# GEO Radar：第四阶段 PRD

> v1.4。未纳入见 [PRD-phase-next.md](../PRD-phase-next.md)。品类 / 周期 / Prompt / exclude 见 [category-selection.md](../category-selection.md)。

| 字段 | 内容 |
|------|------|
| 产品 | GEO Radar |
| 阶段 | Phase 4 · 基线 v1.3 → 目标 v1.4 |
| 文档 | 中文 · 网站英文 |

## 顺序

```text
P0  采集周期抽象（天 / 周期）     ✅
P1  推荐理由原文证据             ✅
P2  Also mentioned               ✅
P3  周期看点                     ✅
P4  竞争象限图                   ✅
P5  品类扩展（8 个）         ✅ 临近 4 档已齐（含当前）
P6  OpenRouter 模型降档 / :floor ✅
```

P5 按品类刷新、P2–P4 跨周期口径均依赖 P0。周期与 Prompt 以 category-selection 为准。

---

## P0 · 采集周期抽象 ✅

- [x] P0-1：**新增** 时间单位为天；默认周期 = 7 天，可配置。
- [x] P0-2：**变更** 「第 N 周 / 最近 N 周」→「第 N 个周期 / 最近 N 个周期」。
- [x] P0-3：**变更** 对外标签一律 `YYYY-MM-DD`（周期起始日）；**禁止** `Week of`；旧串可读并归一成日期。
- [x] P0-4：**新增** 品类各自配置周期天数（已发布亦可改）；默认 7；表见 category-selection。
- [x] P0-5：**变更** Δ、Movers、看点、Layer B、趋势等按**该品类**发布序列计算。
- [x] P0-6：**新增** 品类页标明周期起始日 / last updated；未刷新不得伪装成刚更新。
- [x] P0-7：**约束** 品类页可用该品类最新快照（可与其它品类日期不一致）。**首页不展示单一全局 latest 日期**；内部 `latest` 指针仅工程用。
- [x] P0-8：**约束** 改周期**不删**旧快照/原始回答；**旧周各算 1 个点**（不因改 14 天而合并）。

## P1 · 推荐理由原文证据 ✅

与事实型 Why recommends **并存**。摘录为引擎原文，**不翻译**（中文 locale 也只展示英文原文）。

- [x] P1-1：**新增** 按引擎展示原文摘录，标明引擎与周期。
- [x] P1-2：**约束** 每品牌 × 每引擎最多 1 条；无提及不展示。展示位置在 Rankings by Category 下方；**默认折叠**，点击展开。
- [x] P1-3：**约束** 只摘录，不改写、不经 LLM 润色。
- [x] P1-4：**约束** 跟随所选周期。
- [x] P1-5：**约束** 仅已有 Brand Page 的品牌展示。
- [x] P1-6：**约束** 随周期快照只读发布；单条 ≤280 字符（建议）。
- [x] P1-7：**口径** 选取优先级：① 含品牌名/alias → ② 回答中更靠前 → ③ 同 response 最多 1 条；跨 response 归一化后全文相同则丢。

## P2 · Also mentioned ✅

Overall 下、Top 20 正下方；同宽同栏。

- [x] P2-1：**新增** 仅 Overall；引擎分榜不展示。
- [x] P2-2：**口径** 当周期有提及且不在 Overall Top 20；实体去重。
- [x] P2-3：**口径** 近 4 个已发布周期**累计 mention ≥ 2**；排序用当周期 `mentionRate`（= `appearanceRate`）。
- [x] P2-4：**约束** mentionRate 降序最多 10；无 rank/分数；列 = 名 + rate%。
- [x] P2-5：**约束** 有 Brand Page 可点，否则纯文本；不新建路由。
- [x] P2-6：**约束** 0 条隐藏整块；1–9 有几条显示几条。

## P3 · 周期看点 ✅

一句事实模板（无 LLM）；切引擎 Tab 不变。中文 locale **翻译**模板句；英文 locale 用下方英文模板。

- [x] P3-1：**新增** 引擎 Tab 上方；基于 Overall。
- [x] P3-2：**口径** vs 上一已发布周期，只取第一条成立：
  1. #1 易主 → EN `{Brand} took #1 in {Category}.` / ZH `{Brand} 登上 {Category} 第 1 名。`
  2. 最大上升且 spots ≥ 2 → EN `{Brand} made the largest climb, up {spots} to #{rank}.` / ZH `{Brand} 升幅最大，上升 {spots} 名至第 {rank} 名。`（并列 → 更好 rank → slug 字典序）
  3. NEW → 最好 rank → EN `{Brand} debuted at #{rank} — the highest new entry this period.` / ZH `{Brand} 以第 {rank} 名首次上榜，为本期最高新人。`（并列 → slug）
- [x] P3-3：**约束** 无上一周期或三条皆否 → 不展示。
- [x] P3-4：**约束** 有 Brand Page 可点；EN 不用 `jumped`；不报「进入 Top 20 数量」。

## P4 · 竞争象限图 ✅

与表并存，不替换。

- [x] P4-1：**新增** Overall Top 20 散点；切引擎 Tab 不换图。
- [x] P4-2：**口径** X = Mention Frequency（`appearanceRate`）；Y = Average Rank（`#1` 在上）。
- [x] P4-3：**口径** 当周期实际点中位数分象限；标签 `High/Lower frequency|position`。中位线上：`frequency ≥ median` → High frequency；`averageRank ≤ median` → High position。
- [x] P4-4：**交互** 有 slug 可进 Brand Page。
- [x] P4-5：**约束** 移动端须点击显示名，不得只靠 hover。
- [x] P4-6：**约束** 控制默认标签密度。

### Category board 顺序（Overall）

1. 看点（P3）→ 2. Tab + Top 20 → 3. 象限（P4）→ 4. Also mentioned（P2） ✅

## P5 · 品类扩展

8 品类同一公开节点 + 首页入口。Prompt / 周期 / exclude → [category-selection.md](../category-selection.md)。上线门槛：≥30 有效候选、≥3 引擎达标（有效 response ≥ prompt 条数）、Top 20 无越界实体。校验：`npm run pipeline:launch-gate`。

### 代码就绪（≠ 数据就绪）

- [x] 注册 8 品类：`CATEGORIES` / slug / period days / homepage + rankings 入口 / i18n EN·ZH
- [x] Prompt seed 已写入 `seed-prompts.ts`（需 `npm run seed` 入库存活）
- [x] Exclude 种子写入 `entity-audit` `excludedCategories`（E-commerce / Meeting / Cyber / Recruiting）
- [x] 回填脚本：`npm run backfill:categories`（`--execute` 才真正采；追加 ` as of YYYY-MM-DD`）
- [x] 上线门槛脚本：`npm run pipeline:launch-gate`
- [x] P5-9：**约束** Top 20 须有 Brand Page；Also mentioned 仍 P2-5；exclude 只限本品类
- [x] `npm run seed`（8×8 prompts 已入库；其它环境需再跑）

### 回填口径（纠正）

上线要齐的是 **含当前周期在内的临近 4 档**（不是「剔掉当前再倒推 4 档」）。

- 周期起点按品类 `periodDays` + epoch 对齐（见 `getPeriodStartDate`）。
- prompt 追加 ` as of {periodStartDate}`（`YYYY-MM-DD`）；不用 `Week of` / 月级锚定。
- 回填当普通历史（Δ/NEW/看点/Also mentioned/Layer B/趋势照常）；前台不披露伪历史。
- 不覆盖已有快照除非显式重跑。更老于临近 4 档的历史可留库，但 **不算完成条件**。

基准日：**2026-08-13**。当前周期起点（7 / 14 天）均为 **2026-08-10**。

| 周期 | 临近 4 档（近→远，含当前） |
|------|---------------------------|
| 14 天 | `08-10` · `07-27` · `07-13` · `06-29` |
| 7 天 | `08-10` · `08-03` · `07-27` · `07-20` |

### 采集进度表（as of 2026-08-13 晚，Overall snap）

「已采」= 该周期有 overall 快照；「未采」= 临近 4 档内缺失；「多余更老」= 库里有、但不在临近 4 档（不算完成）。

| # | 品类 | slug | 天 | 临近 4 档目标 | 已采（库内） | 未采（须补） | 多余更老 | 数据状态 |
|---|------|------|----|---------------|--------------|--------------|----------|----------|
| P5-1 | VPN Services | `vpn-services` | 14 | 08-10 · 07-27 · 07-13 · 06-29 | 08-10 · 07-27 · 07-13 · 06-29 · 06-15 · 06-01 | — | 06-15 · 06-01 | ✅ |
| P5-2 | E-commerce Platforms | `ecommerce-platforms` | 14 | 08-10 · 07-27 · 07-13 · 06-29 | 08-10 · 07-27 · 07-13 · 06-29 · 06-15 · 06-01 | — | 06-15 · 06-01 | ✅ |
| P5-3 | Online Course Platforms | `online-course-platforms` | 14 | 08-10 · 07-27 · 07-13 · 06-29 | 08-10 · 07-27 · 07-13 · 06-29 · 06-15 | — | 06-15 | ✅ |
| P5-4 | Language Learning Apps | `language-learning-apps` | 14 | 08-10 · 07-27 · 07-13 · 06-29 | 08-10 · 07-27 · 07-13 · 06-29 · 06-15 | — | 06-15 | ✅ |
| P5-5 | Password Managers | `password-managers` | 14 | 08-10 · 07-27 · 07-13 · 06-29 | 08-10 · 07-27 · 07-13 · 06-29 · 06-15 | — | 06-15 | ✅ |
| P5-6 | AI Meeting Assistants | `ai-meeting-assistants` | 7 | 08-10 · 08-03 · 07-27 · 07-20 | 08-10 · 08-03 · 07-27 · 07-20 · 07-13 | — | 07-13 | ✅ |
| P5-7 | AI Cybersecurity Tools | `ai-cybersecurity-tools` | 7 | 08-10 · 08-03 · 07-27 · 07-20 | 08-10 · 08-03 · 07-27 · 07-20 · 07-13 | — | 07-13 | ✅ |
| P5-8 | Recruiting Tools | `recruiting-tools` | 14 | 08-10 · 07-27 · 07-13 · 06-29 | 08-10 · 07-27 · 07-13 · 06-29 · 06-15 | — | 06-15 | ✅ |

### Ops 待办（数据 / 发布）

- [x] 按上表「未采」补齐各品类（VPN / E-commerce：`07-27` + `08-10`；其余：`08-10`）
- [x] 各品类临近 4 档 launch-gate 通过（`08-10` `--all-new` + VPN/Ecom `07-27`）
- [ ] `publish` / 确认 DB SoT 可读；category-selection 状态 →「已发布」

### 条目（配置 vs 采集分开勾）

- [x] P5-1 配置：**新增** VPN Services（14）。exclude 无种子。
- [x] P5-1 采集：临近 4 档齐（含 `08-10` · `07-27`）
- [x] P5-2 配置：**新增** E-commerce Platforms（14）。开店平台；纯建站器 exclude。
- [x] P5-2 采集：临近 4 档齐（含 `08-10` · `07-27`）
- [x] P5-3 配置：**新增** Online Course Platforms（14）。MOOC / cohort；不做单课/讲师。
- [x] P5-3 采集：临近 4 档齐（含 `08-10`）
- [x] P5-4 配置：**新增** Language Learning Apps（14）。允许与 Course 等双上榜。
- [x] P5-4 采集：临近 4 档齐（含 `08-10`）
- [x] P5-5 配置：**新增** Password Managers（14）。exclude 无种子。
- [x] P5-5 采集：临近 4 档齐（含 `08-10`）
- [x] P5-6 配置：**新增** AI Meeting Assistants（7）。笔记/摘要/助手；视频会议大厂 exclude。
- [x] P5-6 采集：临近 4 档齐（含 `08-10`）
- [x] P5-7 配置：**新增** AI Cybersecurity Tools（7）。AI 安全；传统杀毒 exclude。
- [x] P5-7 采集：临近 4 档齐（含 `08-10`）
- [x] P5-8 配置：**新增** Recruiting Tools（14）。ATS + 招聘；**不拆** Job Board；泛 HRIS exclude。
- [x] P5-8 采集：临近 4 档齐（含 `08-10`）
- [x] P5-9：**约束** Top 20 须有 Brand Page；Also mentioned 仍 P2-5。exclude 只限本品类不计分。

## P6 · OpenRouter 模型降档 / `:floor` ✅

为控制采集成本，更新 `ENGINE_MODEL_SLUGS` / `EXTRACTION_MODEL`；**已发布榜不变**，自下一轮采集起生效。活源以 `src/lib/constants.ts` 为准（覆盖 P3 technical 旧 slug）。

- [x] P6-1：**变更** ChatGPT → `openai/gpt-4.1-mini:floor`（原 `openai/gpt-4o`）。
- [x] P6-2：**变更** Grok → `x-ai/grok-4.3:floor`（原 `x-ai/grok-4.5`）。
- [x] P6-3：**变更** Claude → `anthropic/claude-haiku-4.5:floor`（原 `anthropic/claude-sonnet-4.5`）。
- [x] P6-4：**变更** Gemini / DeepSeek / 抽取模型加 `:floor`；Perplexity 仍 `perplexity/sonar`（单 provider，不加 floor）。
- [x] P6-5：**约束** 不回填已发布周期；不因降档重算历史分数。
