# Roadmap：GEO Radar（第二阶段）

> 本文档是当前第二阶段规划，不是已实现系统规范。第一阶段见 [PRD-phase-1.md](./PRD-phase-1.md)，后续 backlog 见 [PRD-phase-next.md](./PRD-phase-next.md)，系统架构见 [../architecture.md](../architecture.md)。

| 字段 | 内容 |
|------|------|
| 产品名 | **GEO Radar** |
| 仓库 | `geo-rank` |
| 阶段 | 第二阶段（Phase 2） |
| 文档 | 中文 |
| 网站 / Prompt | 英文 |

---

## 1. 实施原则与约束

以下规则适用于本阶段所有功能。

### 1.1 实体关系规则

产品归属公司只用于补充榜单信息，不改变当前产品实体、排名或分数。

- 每个产品最多关联一个 canonical 所属公司。
- 归属关系通过 `parent_brand_id` 表达，无法确认时保持为空。
- 公司更名或产品被收购时保留历史快照中的展示值，当前关系只影响新发布数据。
- 产品别名、旧名称和公司名称需要映射到 canonical entity，避免同一产品拆成多个排名实体。
- 同一公司旗下的多个产品仍然分别参与榜单。
- 公司聚合能力移至 [PRD-phase-next.md](./PRD-phase-next.md)。本阶段只维护产品与所属公司的关系。

### 1.2 Brand Page 分数定义

Brand Page 第一屏展示 Categories 列表，每个 Category 独立展示 Rank、Score 和引擎分项，不创建一个跨品类的默认总分。第一版直接复用 Category 榜单已经发布的分数，确保数据来源清晰。

#### Category 维度

品牌在某个 Category 中的页面显示：

- 该 Category 的当前排名
- 该 Category 的 Visibility Score
- ChatGPT、Gemini、Grok 的分项排名或分数
- Mention Frequency：该品牌被提及的有效回答数 ÷ 该 Category 的有效回答总数

Category 分数沿用现有排行榜评分逻辑，避免 Brand Page 和排行榜出现两个不同结果。

#### 品牌聚合维度

当一个品牌属于多个 Category 时，页面可以展示“Categories”列表，但不默认给出一个简单相加的总分。后续如确实需要品牌总分，建议使用有明确口径的加权聚合，并同时展示覆盖的 Category 数量和有效回答数。

在聚合口径确定前，Brand Page 的主指标应为“当前可见的 Category scores”，而不是一个容易误解的全站总分。

### 1.3 数据异常与缺失处理

- 某个引擎采集失败时，该引擎显示 `No data`，不将缺失结果当作品牌未被提及。
- 某品牌在有效回答中没有出现时，记录为该周该 Category 的 0 次提及，并保留历史记录。
- 品牌首次出现、别名冲突或同名产品需要进入人工 review 队列后再影响正式榜单。
- 某个 Category 发布失败时，不更新该 Category 的 `latest` 指针，并保留上一份可用快照。
- 部分引擎缺失时，页面需要显示数据覆盖范围和当前周状态。
- 缺少足够历史数据时，不生成趋势摘要、不创建可索引 Brand Page。

### 1.4 Brand Page 自动摘要

Why recommends v1 使用事实型模板，只基于当前已发布数据生成，并且需要带有数据周期；第一版不依赖 LLM 自由发挥。

- 只描述排名、分数、提及频率和引擎差异。
- 不推断产品质量、市场份额、用户数量或因果关系。
- 数据不足或存在严重缺失时显示固定提示，不生成推测性文字。
- 摘要应能由同一份快照重新生成，避免与榜单数据不一致。

模板示例：

```text
{Brand} appears in {Category} recommendations across {engines}
and was mentioned in {mentionFrequency}% of valid responses for
the week of {week}.
```

示例表达：

```text
OpenAI ranked #1 in AI Tools for the week of 2026-07-27.
It appeared in 92% of valid recommendation responses, with the
highest visibility in ChatGPT and Grok.
```

### 1.5 SEO 与页面状态

- 最新 Category 榜单保持可索引，并作为 Category 页的 canonical 主页面。
- 历史 `?week=` 页面默认 `noindex`，不进入 sitemap。
- Brand Page v1 默认使用 `noindex`，不进入 sitemap；SEO 开放规则移至 PRD-phase-next.md。
- 未达到数据门槛的品牌不生成公开页面，而不是填充薄内容。
- Brand Page v1 仍需要基础 title、description、Open Graph 信息和 Category 内链，保证可用性和分享效果。

### 1.6 发布、缓存与回滚

发布失败时不推进 `latest`，不把不完整周次加入可用索引，并继续服务上一份可用榜单。历史周请求必须区分请求周次、实际周次和数据更新时间，避免错误缓存成 `latest`。

### 1.7 观测指标

只记录与当前产品能力直接相关的指标，不预设无法验证的流量目标：

- 每周快照发布成功或失败
- 各 Category 和各引擎的数据覆盖情况
- 历史周榜请求成功率
- 周选择器使用次数
- Category 到 Brand Page 的点击次数
- Brand Page 到后续转化入口的点击次数
- 数据异常和人工 review 数量

这些指标用于判断功能是否稳定、用户是否使用，以及哪些数据环节需要改进；不作为虚假的增长承诺。

## 2. 目标

在第一阶段（5 品类 + 3 引擎）的稳定周更基础上，先完善榜单实体信息，再让用户能够查看和理解榜单变化，逐步建立 Brand Page 和后续品牌分析能力。

历史榜单的核心价值不是保存旧表，而是回答三个问题：

- 上周谁涨了、谁掉了？
- 某个品牌是否连续上榜？
- 某个品类的 AI visibility 是否稳定？

因此 Phase 2 的执行顺序是：

```text
P0-A 产品归属公司
P0-B 历史周榜
P1 排名变化 + Biggest Movers + Brand Page v1
后续能力见 PRD-phase-next.md
```

复杂时间轴仪表盘不属于当前阶段重点。

---

## 3. 范围

### 3.1 榜单产品归属公司（P0-A）

榜单列表优先展示产品所属公司，帮助用户区分产品实体和公司实体。例如：

```text
GitHub Copilot
Microsoft
```

产品仍然以独立实体参与排名和计分，所属公司只作为补充信息展示，不合并产品排名。

### 3.2 历史周榜（P0-B）

每个 Category 页支持查看最近 8–12 周的已发布榜单。

当前页面：

```text
/category/ai-tools
```

通过查询参数切换历史周：

```text
/category/ai-tools?week=2026-07-27
```

要求：

- 默认显示最新周，`latest` 不改变现有入口 URL。
- 页面增加周选择器，显示可用周次。
- Overall、ChatGPT、Gemini、Grok 继续使用现有 Tab 切换。
- 页面标题包含当前周次，例如 `AI Tools Visibility Rankings · Week of 2026-07-27`。
- 无效周次、缺失快照和空周需要显示明确提示，并提供返回最新榜单的入口。
- 历史数据只读已发布快照，不触发实时重算或 Postgres 查询。

### 3.3 排名变化与 Biggest Movers（P1）

历史周榜和最新榜单显示相对于上一发布周的变化：

```text
Rank  Brand       Score  Change
1     OpenAI      95     —
2     Anthropic   91     ↑2
3     Google      88     ↓1
```

变化状态包括：

- `↑N`：排名上升 N 位
- `↓N`：排名下降 N 位
- `—`：排名不变
- `NEW`：首次进入该榜单
- `OUT`：上一周上榜、本周退出榜单（可选）

首页可增加 `Biggest Movers This Week`，展示上升和下降幅度最大的品牌。该模块使用最新周与上一周快照计算，不需要复杂动画或图表。

### 3.4 Brand Page v1（P1）

排行榜负责获客，Brand Page 负责承接品牌搜索、展示品牌数据，并把用户引导到相关品类和 GEO 产品能力。Brand Page v1 是 Phase 2 的核心交付，应建立在稳定的周快照和 canonical brand entity 基础上。

品牌页 URL：

```text
/brand/:slug
```

例如：

```text
/brand/openai
/brand/anthropic
/brand/notion
```

第一批只发布有稳定数据的品牌，不直接为所有品牌批量生成页面。

#### v1 页面内容

- 各 Category 的 Visibility Score
- 所属 Category 列表，每个 Category 独立展示当前 Rank 和 Score
- Last Updated
- ChatGPT、Gemini、Grok 的分数或排名
- Mention Frequency / 推荐出现频率
- 100–200 字品牌可见性摘要
- Why recommends 的事实型说明
- 相关 Category 和历史榜单内链
- `Track Your Brand` CTA 占位，不接支付

第一屏不默认选择某个“主 Category”，也不展示未经定义的全站总分。品牌跨多个 Category 时，直接并列展示各 Category 卡片；用户可以从卡片进入对应 Category 榜单。

产品名称链接到 `/brand/{canonicalSlug}`。所属公司当前只作为纯文本展示，不链接到公司页。

Categories 按系统固定的 Category 配置顺序展示，不按当前排名动态重排，保证不同品牌页面的阅读方式一致。

示例结构：

```text
OpenAI AI Visibility Score
Current Rank #1 · Visibility Score 94.8

ChatGPT  #1   Gemini  #3   Grok  #2
Mention Frequency: 92%

```

### 3.5 Brand Page 数据要求

历史榜单发布时需要同时保存以下品牌维度数据：

- canonical brand slug
- 所属 Category
- 每周 rank 和 score
- 各引擎 rank、score 和 mention frequency
- 首次上榜、连续上榜和最近变化

这样 Brand Page 可以直接读取已发布快照，不需要重新计算过去的榜单。

#### 上线和索引门槛

#### Layer A：Brand Page v1 访问条件

满足以下条件即可发布可访问的 Brand Page v1：

- 至少 1 个有效发布周
- 至少一个 Category 在最新周有完整总榜和至少一个引擎分榜
- 最新周数据可以正常读取
- 能生成 Why recommends 事实型摘要
- 至少有一个可用的相关 Category 内链

Brand Page v1 默认使用 `noindex`，不进入 sitemap，页面只展示当前周事实数据。

#### Layer B：趋势与 SEO 开放条件

满足以下条件后，才开放更完整的趋势能力和 SEO 索引：

- 连续 4 个有效发布周
- 能生成基于历史数据的趋势摘要
- Rank History 等历史模块具备可靠数据基础

未达到 Layer A 条件的品牌继续保留实体和数据，待条件满足后再发布页面。Layer B 的 SEO 开放规则见 [PRD-phase-next.md](./PRD-phase-next.md)。

### 3.6 Phase 2 边界

本阶段只交付 P0 和 P1。趋势图、趋势标签、Similar Brands、跨品类分析、品牌监测、自动周报、商业化和更多数据源统一放入 [PRD-phase-next.md](./PRD-phase-next.md)。

---

## 4. Brand Page 数据契约

Brand Page 使用稳定的 canonical entity 和按周版本化的快照。发布结构固定为：

```text
brands/index.json
brands/{slug}/{week}.json
```

品牌文件示例：

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

规则：

- `OpenAI` 生成稳定 slug `openai`；slug 一旦公开，不因品牌改名自动变化。
- slug 冲突时由人工指定稳定后缀，不使用可能变化的排名或日期。
- 一个品牌的一个周快照可以包含多个 Category 记录。
- v1 以 Category score 为主，不强行计算全站品牌总分。
- `schemaVersion` 用于兼容未来字段变化，旧快照不能因新字段缺失而无法读取。
- 榜单中的产品、Brand Page 和所属公司必须引用同一个 canonical entity。

`brands/index.json` 记录可用品牌和周次；Brand Page v1 读取指定品牌的最新有效周快照。数据必须可由已发布榜单快照重新生成，避免页面数字和榜单不一致。

#### slug 维护

- slug 由 canonical brand entity 生成，例如 `OpenAI` → `openai`。
- slug 一旦公开不因品牌改名自动变化。
- slug 冲突由人工确认，并使用稳定后缀解决。
- canonical entity、slug 和 parent company 关系由数据维护者确认后才进入正式发布数据。

#### 快照不可变规则

- 已发布的榜单和 Brand Page 周快照不修改、不删除、不因 merge 回写。
- 品牌合并、别名修正和所属公司变更从新的发布周开始生效。
- 评分公式或数据结构变化时递增 `scoringVersion` 或 `schemaVersion`，不重写旧周结果。
- 已发布快照默认长期保留；原始回答和处理明细的保留周期另行管理。

## 5. 数据与发布方案

历史榜单必须基于不可变的周快照。不能每次根据当前数据重新计算过去的排名，否则评分规则、品牌映射或模型回答变化后，历史趋势会被重写。

当前发布结构继续使用 Blob：

```text
leaderboards/{week}/{slug}.json
leaderboards/latest/manifest.json
```

补充周索引：

```text
leaderboards/index.json
```

示例：

```json
{
  "weeks": ["Week of 2026-07-27", "Week of 2026-07-20"]
}
```

页面读取 `index.json` 获取周次，再根据 `week` 和品类读取对应快照；没有 `week` 参数时继续读取最新榜单。发布流程必须在周榜成功发布后同步更新索引，旧周文件不得覆盖或删除。

发布顺序：

1. 生成并校验 Category 周快照和 Brand Page 周快照。
2. 确认必需文件完整且数据格式有效。
3. 写入对应的周路径。
4. 所有必需快照成功后，再更新 `latest` 和 `index.json`。
5. 发布后抽查最新榜单、历史周和 Brand Page 数据。

## 6. 站点 SEO 策略

本节只规定历史榜单和整体站点的索引策略；Brand Page v1 的页面状态见 `1.5 SEO 与页面状态`。

历史榜单第一版以产品功能和用户可分享性为主，不以批量制造索引页面为目标。

- 最新综合榜保持可索引。
- `?week=` 历史查询默认 `noindex`，必要时 canonical 指向最新 Category 页。
- 不为每个 query 参数主动创建独立 sitemap URL。
- 数据积累并确认历史页面有独立搜索价值后，再评估 `/category/:slug/week/:date` 路由。

## 7. Phase 2 验收标准

### 7.1 P0-A 产品归属公司

- 榜单产品名称下显示已确认的所属公司。
- 产品仍以独立实体参与排名和计分。
- 无明确归属关系时不显示公司字段。
- 产品名称可点击进入对应 Brand Page；所属公司暂为纯文本。

### 7.2 P0-B 历史周榜

- 每个 Category 页可以切换最近 8–12 个可用周次。
- 刷新页面或复制 URL 后，仍显示相同周次和榜单。
- 历史周读取发布快照，不执行实时榜单重算。
- 缺失、无效和空周有清晰的错误状态。
- 发布新周时，周索引和对应 Category 快照保持一致。

### 7.3 P1 排名变化与 Brand Page v1

- 上榜产品名称、Biggest Movers 均可点击进入对应 Brand Page。
- Brand Page 使用稳定 slug，刷新和直接访问均可正常打开。
- Brand Page v1 正确展示 Rank、Category Score、所属公司、引擎分项和 Mention Frequency。
- Brand Page 显示带数据周期的事实型摘要和 Why recommends 内容。
- Brand Page 可以链接回相关 Category 和历史榜单。
- 没有达到数据门槛的品牌不生成可索引薄页面。
- Brand Page 数据与对应周榜快照一致。
- Why recommends 只陈述品牌出现的 Category、引擎和推荐频率事实，不解释因果或产品质量。
- `Track Your Brand` 以静态 CTA 文案展示。
- 1 个有效发布周即可访问 Brand Page v1；连续 4 个有效发布周不作为 v1 的访问前置条件。
- 现有最新榜单 Δ 保留；历史周选择器下的 Δ 按所选周与上一周快照计算。
- 首页 `Biggest Movers` 链接到对应 Brand Page。

### 7.4 工程质量

- Overall、ChatGPT、Gemini、Grok 在历史周中都能正常切换。
- 最新榜单不带 `week` 参数时保持现有行为。
- lint、类型检查和生产构建通过。

## 8. 实施依赖

```text
P0-A 产品归属公司
  → canonical entity、parent company 和榜单展示

P0-B 历史周榜
  → 不可变周快照、leaderboards/index.json 和周选择器

P1 排名变化与 Biggest Movers
  → 当前周与上一有效周快照

P1 Brand Page v1
  → 稳定 slug、Brand Page 周快照、Category 数据和榜单链接
```

各里程碑可以独立验收和发布；Brand Page v1 不应在品牌数据契约确定前开始页面开发。

## 9. 与第一阶段的衔接

- 第一阶段 PRD 保持 MVP 主线，不再混入第二阶段需求。
- 第二阶段需求统一在本文件迭代，便于独立评审和排期。

## 10. PRD 维护规则

- 已实现需求只记录在 `PRD-phase-1.md`。
- 当前正在开发的需求只记录在本文件。
- 尚未排期或需要验证的需求只记录在 `PRD-phase-next.md`。
- 同一需求只保留一个主定义，其他文档只通过链接引用。
