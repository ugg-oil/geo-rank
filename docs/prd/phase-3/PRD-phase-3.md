# GEO Radar：第三阶段 PRD

> 本文档记录第三阶段已实现上线的功能（v1.3），不再作为后续需求清单。实现、门闩、重跑与流程图见 [technical.md](./technical.md)。下一阶段见 [PRD-phase-4.md](../phase-4/PRD-phase-4.md)；未排期见 [PRD-phase-next.md](../PRD-phase-next.md)。
>
> 最后核对：2026-08-06

| 字段 | 内容 |
|------|------|
| 产品 | GEO Radar |
| 阶段 | Phase 3 |
| 版本 | v1.3 |
| 状态 | 已实现上线 |
| 文档 | 中文 · 网站英文 |

## 目标与顺序

在 v1.2 稳定周更与 Brand Page 基础上，扩展 AI 引擎覆盖，并交付品牌页历史分析、公司视角与线索收集（**v1.3**）。

```text
P0-1 ~ P0-5  AI 引擎扩展（Perplexity / Claude / DeepSeek） ✅ 已实现上线
P1-1 ~ P1-6  Brand Page 增强 ✅ 已实现上线
P2-1 ~ P2-3  公司聚合 ✅ 已实现上线
P3-1         品牌线索收集 ✅ 已实现上线
```

---

## 基线：v1.2 已交付

**来自 v1.1（phase-1）**
- 5 品类 × 3 引擎周度采集与 Top 20 榜单
- 首页、Category board、Engine board、Methodology
- 品牌发现、canonical / alias、Review Queue

**来自 v1.2（phase-2）**
- 产品归属公司展示；历史周榜（`?week=` + 周选择器）
- 排名变化（`↑N` / `↓N` / `NEW` / `OUT`）；首页 Biggest Movers
- Brand Page：多 Category 卡片、引擎分项、事实型 Why recommends、`Track Your Brand` CTA 占位
- Brand Page Layer A：`noindex`，不进 sitemap

---

## 约束

继承 [PRD-phase-2.md](../PRD-phase-2.md) 约束；冲突以本文件为准。

**Layer A / Layer B**

- Layer A：Brand Page 可访问；默认 `noindex`，不进 sitemap。趋势图与趋势标签在 Layer A 即可展示（标签另有数据门槛，见 P1-2）。
- Layer B：仅指开放索引与写入 sitemap，见 P1-6。

**本阶段补充**

- 不回写已冻结的历史周。本周冻结前允许同周补洞。公司聚合快照同样遵守。
- 公司聚合是展示视图，不是榜单；不替代产品 Top 20；产品仍独立计分、独立排名。

---

## 范围（v1.3 新增）

### P0 · AI 引擎扩展 ✅ 已实现上线

v1.2 为 ChatGPT、Gemini、Grok。本阶段新增 Perplexity、Claude、DeepSeek。三个新引擎与旧引擎同一生产周一起上。

- P0-1 ✅ 已实现上线：**新增** 引擎接入能力：可扩展采集与计分；未达标引擎本周为 `No data`，不挡其他引擎；前台按实际引擎动态展示；计分引擎变多时给出一次性说明。
- P0-2 ✅ 已实现上线：**新增** Perplexity。
- P0-3 ✅ 已实现上线：**新增** Claude。
- P0-4 ✅ 已实现上线：**新增** DeepSeek。
- P0-5 ✅ 已实现上线：**新增** 多引擎评分与历史兼容：Model Coverage 按当周该 Category 实际计分引擎数计算；各计分引擎等权；旧周语义不变。

**v1.3 / P0 过线** ✅ 已实现上线：三个新引擎进入同一生产发布周；至少 1 个当周计分并出现在前台；未达标的为 `No data`，不挡发布。


实现细节见 [technical.md](./technical.md)。

### P1 · Brand Page 增强 ✅ 已实现上线

- P1-1 ✅ 已实现上线：**新增** Rank History 和 Score History 趋势图。按 Category 分别画；Layer A 即可展示；点数 = 实际有 rank/score 的已发布周。
- P1-2 ✅ 已实现上线：**新增** 趋势标签（`Rising` / `Stable` / `Declining`）。每个 Category 卡片各自打标，不打品牌总标签。与首页 Biggest Movers（单周 `↑N`/`↓N`）区分口径。
  - 窗口：该 Category 最近 4 个已发布周。
  - 有效点：品牌在该周该 Category 综合榜有 rank。有效点 < 3 → 不展示标签。
  - 4 个点：前两周均秩 vs 后两周；3 个点：最早 vs 最晚。`Δ = 新 − 旧`（rank 变小更好）。
  - `Rising`：`Δ ≤ -2`；`Declining`：`Δ ≥ +2`；其余 `Stable`。
- P1-3 ✅ 已实现上线：**新增** Similar Brands。不走 LLM。
  - 同一 Category；最新周双方都在综合 Top 20；候选满足 Layer A；排除自己。
  - `|rankA − rankB| ≤ 5`。
  - 最新周至少共享 1 个计分引擎分榜。
  - 排序：`|Δrank|` 升序 → 共享引擎数降序 → `slug` 升序。最多 4 个。
- P1-4 ✅ 已实现上线：**增强** 多 Category 对比：排序切换（`Score` / `Rank` / `Mention Frequency`）、Top/Bottom 高亮、品类间差值与可选对比条；不设跨品类总分。
- P1-5 ✅ 已实现上线：**增强** Why recommends：多 Category 摘要、趋势变化、引擎差异；只用事实模板，不推断质量或因果。
- P1-6 ✅ 已实现上线：**新增** Layer B SEO。连续 4 个发布周满足 Layer A 后开放索引并写入 sitemap。

### P2 · 公司聚合 ✅ 已实现上线

v1.2 仅展示产品级 `parentCompany`。本阶段新增公司页，不另做采集。

- P2-1 ✅ 已实现上线：**新增** 公司聚合口径。公司 = 父 Brand；无独立公司排名或总分。
- P2-2 ✅ 已实现上线：**新增** `/company/:slug`：公司名、名下产品及各 Category 独立排名/分数，回链 Brand Page 与 Category 榜。`parentCompany` 可点进公司页。v1.3 全部 `noindex`、不进 sitemap。
- P2-3 ✅ 已实现上线：公司聚合不影响产品独立计分与排名；同一产品从 Company 页与 Category 页看到的数字必须一致。

### P3 · 品牌线索收集 ✅ 已实现上线

v1.2 仅有 CTA 占位。本阶段只落地线索收集，不做监测/审计/付费——先验证有多少人真的愿意留资料，再决定是否投入后续商业化基础设施。

- P3-1 ✅ 已实现上线：**新增** `Track Your Brand` / `Get GEO Audit` 表单与入库。
  - 必填：`email`、`brandName`、`intent`（`track_brand` | `geo_audit`）、`consent`。
  - 选填：`website`、`message`（≤500 字）。
  - 不接支付、不做账号/权限、不接 CRM；v1.3 不要求自动发信。

> 持续监测、竞品追踪、GEO Audit 报告、通知、付费分层（原 P3-2~P3-6）见 [PRD-phase-next.md](../PRD-phase-next.md)。

---

## 依赖

```text
P0-2 ~ P0-4 → P0-1
P0-5        → 同一生产周至少 1 个新引擎计分
P1-1 ~ P1-2 → v1.2 历史周快照 + Brand Page 周数据
P1-3        → 同 Category 最新周综合榜 + 计分引擎分榜
P1-4        → v1.2 多 Category 卡片
P1-5        → v1.2 Why recommends + P1-1 / P1-2
P1-6        → Layer A 稳定 + 连续 4 周数据
P2-2        → P2-1 + v1.2 产品归属关系
```

---

## 验收

**P0** ✅ 已实现上线
- 三个新引擎与旧引擎同一生产周采集；未达标为 `No data`，不进该 Category 分母，不阻断其他引擎。
- Tab 按采集引擎展示，名称是具体引擎；综合榜只用达标计分引擎。
- 首页引擎数 / prompt 数随实际采集集变化；文案用 “AI engines”。
- 某 Category 计分引擎比上周增多时，出现一次性覆盖扩展说明。
- v1.3：至少 1 个新引擎当周计分。技术门闩与重跑见 [technical.md](./technical.md)。

**P1** ✅ 已实现上线
- 趋势图只读已发布周快照；Layer A 即可看。
- 趋势标签按 Category、近 4 个已发布周、阈值 `Δ ≤ -2` / `Δ ≥ +2`。
- Similar Brands 规则与上限见 P1-3；无 LLM。
- 多 Category 排序不产生跨品类总分。
- Why recommends 仅事实；抽查至少 3 个品牌页。
- Layer B：连续 4 周 Layer A 后开放索引并进 sitemap；否则 `noindex`；状态可由已发布周榜确定性重算（无需单独变更日志）。

**P2** ✅ 已实现上线
- `/company/:slug` 可访问；无公司排名/总分；与 Category 页数字一致。
- v1.3 全部 Company 页 `noindex`。

**P3** ✅ 已实现上线
- 必填校验生效；提交成功入库；失败有明确提示。
- 未接支付 / 权限 / CRM。

---

## 文档规则

- 需求只在本文件定义；实现只在 [technical.md](./technical.md)。
- v1.1 → phase-1 · v1.2 → phase-2 · v1.3（已实现上线）→ 本目录 · v1.4 → phase-4 · 未排期 → phase-next
- 与 phase-2 冲突时以本文件为准
