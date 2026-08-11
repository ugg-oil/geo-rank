# GEO Radar：第一阶段 PRD

> 本文档记录第一阶段已实现的 MVP，不再作为后续需求清单。
>
> 最后核对：2026-07-31

| 字段 | 内容 |
|------|------|
| 产品 | GEO Radar |
| 阶段 | Phase 1 |
| 版本 | v1.1 |
| 文档 | 中文 · 网站英文 |

## 产品范围

GEO Radar 每周使用固定英文 prompt 询问 ChatGPT、Gemini 和 Grok，从 AI 回答中动态提取被推荐的产品和品牌，并按品类发布 Top 20 AI Visibility Rankings。

第一阶段包含 5 个品类：

- AI Tools
- SaaS Software
- AI Image / Video Tools
- Developer Tools
- Marketing Tools

## 已实现能力

- 5 品类 × 3 引擎的周度采集与计分。
- 品类综合榜和 ChatGPT / Gemini / Grok 分榜。
- 动态品牌发现、canonical name 和 alias 合并。
- 未匹配品牌自动创建并进入 Review Queue。
- `review:auto` 自动审核，以及人工 review 导入流程。
- Appearance Rate、Average Rank、Model Coverage 和 0–100 Score。
- 首页、Category board、Engine board 和 Methodology 页面。
- 首页和 Category 页的 SEO 介绍内容。
- 首个周快照：`Week of 2026-07-27`。
- 周榜快照发布到 Vercel Blob，前台不在用户请求时直接查询数据库。

固定 prompt 集合由 `src/scripts/seed-prompts.ts` 维护，每个品类 8 条，不包含品牌名，并通过 `prompt_set_id` 参与周度数据追踪。

## 当前数据规则

- 有效回答必须 API 成功、正文非空且不是完全拒绝。
- 总榜综合 Appearance Rate、Avg Rank Score 和 Model Coverage。
- 单引擎榜使用 Appearance Rate 和 Avg Rank Score。
- 各品类独立发现品牌并独立取 Top 20。
- merge / ignore 从后续 pipeline 生效，不重写已发布快照。

## 参考文档

- [系统架构](../engineering/architecture.md)
- [数据管道](../engineering/data-pipeline-2026-07-30.md)
- [Review Queue](../ops/review-queue.md)
- [运维文档](../ops/operations.md)
