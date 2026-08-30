# GEO Radar：后续规划

> **未排期**（后续开发池）。已发布见 [phase-1](./PRD-phase-1.md)、[phase-2](./PRD-phase-2.md)、[phase-3](./phase-3/PRD-phase-3.md)、[phase-4](./phase-4/PRD-phase-4.md)（v1.4）、[phase-5](./phase-5/PRD-phase-5.md)（v1.5）。定稿：[phase-6](./phase-6/PRD-phase-6.md)（v1.6 · Watch / 官网 / 建议新品类 / 周期发布提醒 / 周期拉长）。
>
> 品类清单 / 周期 / Prompt 维护见 [category-selection.md](./category-selection.md)。
>
> Watch、建议新品类、周期发布提醒已进 [phase-6](./phase-6/PRD-phase-6.md) P2–P4，本文件不再重复。

---

## 产品入口（未排期）

目标：一入口一承诺，优先邮件，后做账号。与后期销售型 GEO Audit 解耦。

### N3 · GEO Audit（后期 · 独立入口）

人工 GEO 可见度诊断与改进建议。**单独做一块**，不挂在监控 CTA 里。

**入口（后期）**

- 导航栏独立项（如「GEO Audit」/「诊断」），或定价 / 服务页
- Brand 页可在 Watch 成功态下**轻量二次**：「还想提升排名？申请诊断」——不得作为主按钮

| | Watch（phase-6 P2） | N3 Audit |
|--|----------|----------|
| 承诺 | 周期邮件通知数据变化 | 人工/半人工分析与建议 |
| 表单 | 邮箱 + 监控对象 | 公司、网站、需求、联系许可 |
| 入口 | category / brand | 导航 / 服务页 |
| 时机 | 本阶段 | 后期 |

---

### 可补充的同类入口

| 代号 | 想法 | 建议入口 | 说明 |
|------|------|----------|------|
| N5 | **竞品进入 Top 20 警报** | brand / compare | 指定竞品列表；任一进入或进入 Top N 时通知 |
| N6 | **未发布品类 Waitlist** | rankings 未发布卡片 | 「该品类首次发布时通知」；与建议新品类可合并 UI，意向不同 |
| N7 | **周报 Digest** | rankings / 邮件设置 | 用户自选多个品类，每周一封汇总（Top movers） |
| N8 | **引擎分歧提醒** | brand | 仅当引擎间排名差超过阈值时通知（噪音更低） |
| N9 | **分享监控列表** | 邮件确认后的落地页 | 只读公开列表 URL；利于传播 |
| N10 | **品牌认领（Claim）** | brand | 「我是该品牌方」→ 验证域名/邮箱；与 Watch 分开，后期接后台权限 |
| N11 | **导出订阅** | category | 「每周期把 CSV/PDF 发到邮箱」；偏重度用户，可作 Watch 加档 |

**排序建议（讨论用，非排期）**

1. N6（复用 phase-6 邮件基建）
2. N7 Digest（多品类用户）
3. N3 Audit（导航独立）
4. 其余按商业化节奏

---

## 内容传播

- 周期报告自动生成：品类摘要、关键变化、数据周期
- Top Gainers / Top Losers / New Entries
- 引擎推荐差异分析
- X / LinkedIn / Reddit / HN 发布素材（预览 + 人工审核）

## 品牌对比

- 同一品类对比 2–3 个品牌，URL 可分享
- Rank 历史折线、引擎分项柱状图、Mention Frequency 柱状图
- 缺失数据展示 `No data`
- 初期免费；后续付费能力：保存竞品组、自动提醒、更长历史、CSV / PDF 导出

## 商业化

前置：线索有真实需求；**Watch（phase-6 P2）与销售型 Audit（N3）分流后再扩付费。**

- 持续品牌监测（由 Watch 演进：多品牌、阈值、历史深度）
- 自定义品牌与竞品追踪（衔接 N5）
- GEO Audit 结构化报告（N3）
- 行业基准（如本品类平均 Mention Frequency），供品牌自我对比
- 邮件 / webhook 通知（邮件优先；Watch 落地后扩展 webhook）
- 付费分层、权限、团队配额

## AI 引擎

接入流程沿用 [phase-3 technical](./phase-3/technical.md)。

- Microsoft Copilot
- Kimi

## 高级分析

- 任意时间范围（周期粒度）
- prompt / use-case 维度分析
- 引擎推荐差异的规则化解释
