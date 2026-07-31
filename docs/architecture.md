# Architecture

GEO Radar 将 AI 生成回答转换为可比较的品牌可见度榜单。

## 数据流

```text
AI 回答
  → mention 抽取
  → 品牌规范化与审核
  → 分类与计分
  → 周榜快照
  → Vercel Blob
  → 前台榜单页面
```

## 组件职责

- PostgreSQL：后台计算、品牌、提及、审核队列和历史记录。
- Prisma：数据库 schema 和应用侧数据访问。
- Pipeline：采集、抽取、规范化、分类、计分和发布。
- Vercel Blob：前台使用的静态榜单 JSON。
- Next.js：渲染首页、分类页、方法论页及 pipeline API。
- Cron：按周触发 pipeline。

用户访问榜单时优先读取 Blob 快照；本地开发或 Blob 不可用时回退到数据库查询。

## 品牌规范化

规范名和别名优先精确匹配。未匹配的品牌会自动创建并参与当周计分，同时进入 `brand_review_queue`。审核结果从下一周 pipeline 起生效，不重算已经发布的快照。

## 发布与回退

一次 pipeline 会生成各品类榜单 JSON，并记录 `pipeline_runs`。生产环境应同时确认运行状态成功、快照数量大于零、manifest URL 已写入。Blob 读取失败或周次不一致时，前台使用数据库回退路径，避免显示错误周次的数据。

## 相关文档

- [Getting Started](./setup.md)：环境、本地开发和部署
- [Operations](./operations.md)：周更、Cron、发布和故障处理
- [Review Queue](./review-queue.md)：品牌审核操作
- [PRD](./PRD.md)：当前产品范围和实现状态
- [Roadmap](./PRD-phase-2.md)：第二阶段规划
