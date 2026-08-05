# GEO Radar：后续规划

> 本文档收纳尚未纳入 Phase 3 的后续规划。
>
> 已实现见 [PRD-phase-1.md](./PRD-phase-1.md)、[PRD-phase-2.md](./PRD-phase-2.md)，当前开发见 [PRD-phase-3.md](./phase-3/PRD-phase-3.md)。

| 字段 | 内容 |
|------|------|
| 产品 | GEO Radar |
| 阶段 | Phase Next（未排期） |
| 文档 | 中文 · 网站英文 |

## AI 引擎扩展（phase-3 之后）

Phase 3 规划接入 Perplexity、Claude、DeepSeek（见 [PRD-phase-3.md](./phase-3/PRD-phase-3.md) P0）。验证本阶段新引擎的接入成本和 pipeline 稳定性后，再评估：

- Microsoft Copilot 接入。
- Kimi 接入。

沿用 [phase-3 技术文档](./phase-3/technical.md) 的接入要求（staging/fixture、干跑、当周达标即计分、成本预估），不重新定义一套流程。

## 品牌监测与商业化（phase-3 之后）

Phase 3 仅落地 `Track Your Brand` 表单与线索入库（P3-1）。待线索验证有真实需求后，再启动：

- 持续品牌监测。
- 自定义品牌与竞品追踪。
- GEO Audit 结构化报告。
- 邮件 / webhook 通知（邮件优先）。
- 付费分层、权限模型与团队配额。

## 高级分析（phase-3 之后）

依赖 phase-3 P0（多引擎）与 P1（Brand Page 增强）主链路数据稳定后再评估，探索性质强，暂不排期：

- 任意时间范围筛选（周粒度）。
- prompt / use-case 维度分析。
- 推荐理由来源追踪与证据展示。
- 模型间推荐差异的规则化自动解释。

## 内容传播扩展

在 Phase 2 手工验证周报价值后，扩展为：

- P1-1：每周自动生成结构化 AI Visibility Weekly Report，含各品类摘要、关键变化与数据周期说明。
- P1-2：从周榜快照自动提取 Top Gainers、Top Losers、New Entries，作为周报模块与独立摘要输出。
- P1-3：自动生成 ChatGPT、Gemini、Grok 之间的推荐差异分析，统一术语与文案结构。
- P1-4：基于周报内容生成 X、LinkedIn、Reddit、Hacker News 发布素材；支持预览与人工审核后发布。

## 覆盖范围扩展

在 Brand Page 和现有周更流程稳定后，再评估增加：

- Website Builders
- Hosting / Cloud
- Productivity Apps
- Education / Courses
- Design Tools

---

## 文档规则

- 已实现 → phase-1、phase-2 · 当前开发 → phase-3 · 未排期 → 本文件
- 同一需求只保留一处主定义
