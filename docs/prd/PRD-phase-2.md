# Roadmap：GEO Radar（第二阶段）

> 本文档记录第二阶段已实现的功能，不再作为后续需求清单。下一阶段见 [PRD-phase-3.md](./phase-3/PRD-phase-3.md)。

| 字段 | 内容 |
|------|------|
| 产品 | GEO Radar |
| 阶段 | Phase 2 |
| 版本 | v1.2 |
| 文档 | 中文 · 网站英文 |

## 目标与顺序

在稳定周更上完善实体信息、历史周、排名变化，并交付 Brand Page v1（**v1.2**）。

```text
P0-A ✅ 产品归属公司
P0-B ✅ 历史周榜
P1 ✅ 排名变化 + Biggest Movers + Brand Page v1
```

后续（趋势图、Similar Brands、商业化等）见 phase-3。

历史周要回答：谁涨谁跌、是否连续上榜、品类可见性是否稳定。不做复杂时间轴仪表盘。

---

## 约束（全阶段通用）

**实体**
- 产品独立计分；所属公司仅展示，不合并排名。
- 每个产品最多一个 `parent_brand_id`；无法确认则空。
- 历史快照保留发布时的展示值；关系变更只影响新周。
- 公司聚合能力在 phase-3。

**Brand Page 分数**
- 按 Category 展示 Rank / Score / 引擎分项 / Mention Frequency。
- 不设跨品类默认总分；分数必须与对应周榜一致。

**异常**
- 引擎采集失败 → `No data`，不等于未被提及。
- Category 发布失败 → 不推进该 Category 的 `latest`。
- 品牌首次出现 / 别名冲突 → review 后再进正式榜。

**Why recommends（v1）**
- 事实模板，带数据周期；不依赖 LLM 自由发挥。
- 只写排名、分数、提及频率、引擎差异；不推断质量或因果。

**SEO**
- 最新 Category 榜可索引。
- `?week=` 历史页、Brand Page v1：默认 `noindex`，不进 sitemap。
- Brand Page 仍要有基础 title / description / OG / Category 内链。

**发布**
- 失败不推进 `latest`，继续服务上一份可用榜单。
- 已发布周快照不可变：不改、不删、不因 merge 回写。

---

## 范围

### P0-A ✅ 产品归属公司

榜单产品下展示已确认所属公司（纯文本）；产品名可点进 Brand Page。

```text
GitHub Copilot
Microsoft
```

### P0-B ✅ 历史周榜

- URL：`/category/:slug?week=YYYY-MM-DD`；无参数 = 最新周。
- 周选择器：最近 8–12 个已发布周。
- 只读 Blob 快照，不实时重算 / 不查 Postgres。
- 无效 / 缺失周有明确提示 + 回最新入口。

发布结构：

```text
leaderboards/{week}/{slug}.json
leaderboards/latest/manifest.json
leaderboards/index.json          # {"weeks":["Week of …", …]}
```

发布顺序：校验周快照 → 写周路径 → 成功后再更新 `latest` + `index.json`。

### P1 ✅ 排名变化 + Biggest Movers

相对上一发布周：

| 状态 | 含义 |
|------|------|
| `↑N` / `↓N` | 升 / 降 N 位 |
| `—` | 不变 |
| `NEW` | 首次上榜 |
| `OUT` | 上周在榜本周退出（可选） |

首页可加 `Biggest Movers This Week`（最新周 vs 上一周）。

### P1 ✅ Brand Page v1

URL：`/brand/:slug`（如 `/brand/openai`）。

**页面**
- 各 Category：Rank、Score、引擎分项、Mention Frequency
- 所属公司（纯文本）、Last Updated
- 事实型摘要 + Why recommends
- Category / 历史榜内链、`Track Your Brand` CTA 占位（不接支付）
- 多 Category 并列卡片；不按排名重排 Category 顺序

**门槛**
- Layer A（可访问 v1）：≥1 个有效发布周 + 最新周可读 + 能生成事实摘要 → `noindex`
- Layer B（趋势 / SEO）：连续 4 周 → 规则在 phase-3

**数据契约**

```text
brands/index.json
brands/{slug}/{week}.json
```

```json
{
  "schemaVersion": 1,
  "scoringVersion": 1,
  "week": "Week of 2026-07-27",
  "slug": "openai",
  "name": "OpenAI",
  "parentCompany": null,
  "updatedAt": "2026-08-10",
  "categories": [
    {
      "slug": "ai-tools",
      "rank": 1,
      "score": 94.8,
      "mentionFrequency": 0.92,
      "engines": {
        "chatgpt": { "rank": 1, "score": 98 },
        "gemini": { "rank": 3, "score": 84 },
        "grok": { "rank": 2, "score": 91 }
      }
    }
  ]
}
```

- slug 由 canonical name 生成，公开后不因改名自动变；冲突人工加稳定后缀。
- Brand 数据可由榜单快照重生成，数字必须一致。
- 公式 / 结构变更递增 `scoringVersion` / `schemaVersion`，不重写旧周。

---

## 验收

**P0-A** ✅ 已确认公司显示在产品下；无归属不显示；产品仍独立计分。

**P0-B** ✅ 可切换 8–12 周；URL 可分享复现；只读快照；索引与 Category 文件一致。

**P1**
- ✅ Δ 在最新周与历史周选择器下均可按「所选周 vs 上一周」计算。
- ✅ Brand Page slug 稳定；与周榜数字一致；Why recommends 仅事实。
- ✅ 1 周即可访问 v1；4 周不是 v1 前置条件。
- ✅ Movers / 产品名可点进 Brand Page。

**工程** 历史周下四 Tab 可用；无 `week` 时行为与现网一致；lint / 类型 / 生产构建通过。

---

## 依赖

```text
P0-A → canonical + parent company 展示
P0-B → 不可变周快照 + index.json + 周选择器
P1 Δ / Movers → 当前周与上一有效周
P1 Brand Page → slug + brand 周快照 + Category 链接
```

里程碑可独立验收；Brand 数据契约未定前不开始 Brand Page UI。

## 文档规则

- v1.1 → phase-1 · v1.2 → phase-2 · v1.3（已实现上线）→ phase-3 · v1.4 → phase-4 · 未排期 → phase-next
- 同一需求只保留一处主定义
