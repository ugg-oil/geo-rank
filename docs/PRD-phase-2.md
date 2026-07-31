# Roadmap：GEO Radar（第二阶段）

> 本文档是未来规划，不是当前系统规范。当前产品范围见 [PRD.md](./PRD.md)，系统架构见 [architecture.md](./architecture.md)。

| 字段 | 内容 |
|------|------|
| 产品名 | **GEO Radar** |
| 仓库 | `geo-rank` |
| 阶段 | 第二阶段（Phase 2） |
| 文档 | 中文 |
| 网站 / Prompt | 英文 |

---

## 1. 目标

在第一阶段（5 品类 + 3 引擎）的稳定周更基础上，扩展覆盖范围与可探索深度，提升榜单广度与品牌分析能力。

---

## 2. 范围

### 2.1 追加品类（+5）

- Website Builders
- Hosting / Cloud
- Productivity Apps
- Education / Courses
- Design Tools

### 2.2 追加引擎（+3）

- Perplexity
- Claude
- DeepSeek

### 2.3 新增品牌详情页

- Brand Profile 页：`/brand/:slug`
- 展示信息：
  - GEO Score
  - 各引擎分数
  - 品类排名
  - 竞品对比

### 2.4 产品与所属公司展示

在产品榜中保留产品的独立实体和独立排名，同时在产品名称下方展示所属公司，帮助用户理解产品归属关系。

示例：

```text
GitHub Copilot
Microsoft
```

规则：

- `Microsoft Copilot`、`GitHub Copilot`、`Power Apps`、`Power Automate` 仍作为独立产品参与产品榜。
- 所属公司关系通过 `parent_brand_id` 表达，不用于合并产品或改变产品分数。
- 没有明确母公司的产品不展示公司字段。
- 产品榜的主实体仍然是产品，不改为公司榜。

后续可选扩展：

- Company Visibility 页面：展示 Google、Microsoft、OpenAI 等公司旗下产品的整体 AI 推荐曝光。
- 公司聚合榜：在独立页面中按母公司汇总旗下产品的 GEO visibility，不替代产品 Top 20。

---

## 3. 与第一阶段的衔接

- 第一阶段 PRD 保持 MVP 主线，不再混入第二阶段需求。
- 第二阶段需求统一在本文件迭代，便于独立评审和排期。
