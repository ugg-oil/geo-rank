# GEO Radar：第五阶段 PRD

> v1.5。基线 [phase-4](../phase-4/PRD-phase-4.md)。实现见 [technical.md](./technical.md)。未排期 [phase-next](../PRD-phase-next.md)。品类 [category-selection](../category-selection.md)。

| 字段 | 内容 |
|------|------|
| 产品 | GEO Radar |
| 阶段 | Phase 5 · v1.4 → v1.5 |
| 状态 | 开发中 |
| 文档 | 中文 · 网站英文 |

## 顺序

```text
P0  首页优化          /
P1  榜单页优化        /rankings
P2  品类排行页        /category/[slug]
P3  品牌详情页        /brand/[slug]
P4  公司页            /company/[slug]
P5  品类扩展（11 个）  category-selection
P6  实体质量 / 榜单可信度（全品类）
```

## 全站约束（本阶段）

- 对外 **period / 采集周期**，日期 `YYYY-MM-DD`；禁止 week / Weekly。
- 首页仍不展示单一全局 latest（phase-4）。
- 首页与榜单页品类列表**同源**（同一配置），禁止两套清单。
- Brand / Company / Category 页内周期与该页榜、摘录、趋势、Δ **同源**；不另引无关全局 latest。
- 品类/品牌 Δ 语义统一：升 / 降 / 新进 / 持平；无上期 → —。

## P0 · 首页优化 · `/`

建议顺序：Hero（含本周期数据卡）→ Top 预览 → Movers → Period Insights → Categories → Footer。

- [x] P0-1：**新增** Hero 下 Overall Top 5 预览（默认 AI Tools；标明该品类周期起始日）+「View full ranking」进该品类页。
- [x] P0-2：**变更** Movers 加厚（品牌 + 品类 + 名次变化 + 放大位次差）；品牌→Brand、品类名→Category；压缩与下一块空白。
- [x] P0-3：**新增** Period Insights 2–3 条（规则模板，无 LLM）；无内容整块不展示。
- [x] P0-4：**变更** Hero 右侧抽象 Why →「本周期」实数：引擎数、prompts、品类数；可选 Most visible、Biggest mover（有则显示）。
- [x] P0-5：**变更** 品类入口 →「Categories we track」+「View all categories」进榜单页（同源约束见上）。

## P1 · 榜单页优化 · `/rankings`

- [x] P1-1：**变更** 品类卡：#1 行去掉「this period / 本周期」（例 `#1 · ChatGPT`）；卡下 Top 3 名称+得分；#1→Brand，卡主体→Category。左侧序号不表示跨品类总排名。
- [x] P1-2：**新增** 按品类名筛选（无匹配空态）；无已发布数据的品类不进列表或不可点。

## P2 · 品类排行页 · `/category/[slug]`

- [x] P2-1：**变更** Top 20 表默认按综合得分；可切出现率 / 平均名次 / 覆盖率。平均名次越小越好；`#` 列保持发布名次；覆盖率仅综合榜。表头问号 Tooltip（得分、出现率、平均名次、覆盖率；后两者必写清含义；中英）。
- [x] P2-2：**新增** 同品类、当前引擎 Tab 下对比 2–3 个产品：勾选→底部入口→并排指标（得分 / 出现率 / 平均名次 / 覆盖率）；少于 2 不能比，多于 3 不能再选；分榜无覆盖率则不展示该行；最优可高亮。
- [x] P2-3：**变更** Also mentioned 说明带周期日：ZH「截止本周期 {YYYY-MM-DD}…」；EN 等价。日期 = 当前页所选周期起始日。
- [x] P2-4：**变更** 竞争象限（基座 phase-4）：X=出现率，Y=平均名次（`#1` 在上）；四象限颜色 + 对外名领导者/挑战者/利基/落后（中位划分不变）；悬停/点选显示品牌+关键指标并进 Brand（移动端不得只靠 hover）。
- [x] P2-5：**新增** 本周期 vs 上周期位移：上期淡点 + 本期实点 + 同品牌连线/箭头；两期并集 scale；中位线用本周期；无上一已发布周期则不提供。仍只 Overall Top 20。
- [x] P2-6：**变更** 样式优化：Top 20 表、对比入口/弹层、竞争象限、Also mentioned 视觉层级与间距统一；桌面/移动可读；沿用现有 CSS token，不另开视觉体系；不改 P2-1～P2-5 的指标语义与交互契约。

## P3 · 品牌详情页 · `/brand/[slug]`

摘录规则仍遵 [phase-4 P1](../phase-4/PRD-phase-4.md)。

- [x] P3-1：**变更** 「为什么 AI 推荐」默认展开、可收起（收起后标题仍在）；旁注「基于 {YYYY-MM-DD}」与品类页周期格式对齐。
- [x] P3-2：**变更** Why 正文 → 结构化三卡：**优势** / **弱点** / **趋势**（规则模板，无 LLM）。锚定 = `from` 品类（若在列表）否则最佳名次品类；可保留一行 rank/score/mention 摘要。优势=引擎名次最好 1–2（或明显好于 overall）；弱点：「几乎不提」=已采集未进该引擎 Top20，「弱」=有榜最差；趋势=升/稳/降，无历史则隐藏；引擎接近则不硬拆或文案「各引擎接近」。
- [x] P3-3：**变更** 「推荐原文」外层默认展开；按引擎分组，默认只显第一个有摘录的引擎；「全部展开 / 全部收起」；无摘录整块不展示。
- [x] P3-4：**变更** 品类卡：`from=/category/{slug}` 时该卡置顶；显示相对上期 Δ；引擎徽章链 `/category/{slug}?engine=`。
- [x] P3-5：**变更** Similar →「同品类相近排名」+ 对方名次（无则隐藏）；Lead CTA 贴近「监测该品牌可见度」（表单不变）；无品类上榜空态 + 链 `/rankings`。
- [x] P3-6：**新增** 排名/得分历史图可选起止两个周期日（来自该品类历史点）；默认全范围；起晚于止则纠正或禁用；范围内无点空态；两图共用同一范围。

## P4 · 公司页 · `/company/[slug]`

沿用 phase-3：公司 = 父 Brand 聚合；**无**公司总分/总排名；名下产品数字与 Brand/Category 一致。

- [x] P4-1：**新增** 公司表现摘要：产品数、上榜品类数（去重）、最佳名次产品；可选最大上升。规则模板。无产品则摘要与列表都不展示；空态链 `/rankings`。
- [x] P4-2：**变更** 产品列表按名次 / 得分 / 品类排序，**默认名次**（名次=各品类最佳名次升序；得分=各品类最高分降序；品类=主品类名字典序；同键按产品名）。`from=/brand/{slug}` 时该产品置顶。品类行显示相对上期 Δ。

## P5 · 品类扩展（11 个）

新增 11 个品类并补齐含当前周期在内的临近 4 档数据；可分批发布。Prompt / 周期 / exclude 定稿见 [category-selection.md](../category-selection.md)；实现与回填步骤见 [technical.md](./technical.md)。与既有 **13** 品类合计 **24**；本批 11 个已回填临近 4 档（**含 DeepSeek**）。

上线门槛（产品）：≥30 有效候选、≥3 引擎达标、Top 20 无越界实体。本批均为 **14 天**；临近 4 档（近→远）：`08-10` · `07-27` · `07-13` · `06-29`（基准日 2026-08-14）。

**回填进度（2026-08-16）**：11 品类 × 4 档 × 6 引擎已采并发布到 DB（含 DeepSeek；`P5-n-*-6` 已勾）。Company 列已补 P5 curated parent map（`parent-company.ts`）。临近 4 档 `pipeline:launch-gate --all-new` 全绿；HR ATS exclude（Greenhouse / Lever / Ashby / Workable / Jobvite / SmartRecruiters / iCIMS）已写入 `entity-audit`。已知软缺口：Accounting `07-13` Gemini 曾失败、部分档 snaps 略少。

| # | 品类 | 中文名 | slug | 天 | 口径 / 边界 |
|---|------|--------|------|----|-------------|
| P5-1 | Project Management Tools | 项目管理工具 | `project-management-tools` | 14 | 项目/任务协作；不做纯文档/白板大杂烩 |
| P5-2 | CRM Platforms | 客户关系管理 | `crm-platforms` | 14 | CRM / 销售管道；允许与 Marketing / Support 双上榜 |
| P5-3 | Customer Support / Helpdesk | 客服与工单系统 | `customer-support-helpdesk` | 14 | 客服工单 / 收件箱；允许与 CRM 双上榜 |
| P5-4 | Accounting & Invoicing Software | 会计与发票软件 | `accounting-invoicing-software` | 14 | SMB 会计/发票；排除银行；泛 ERP 越界则 exclude |
| P5-5 | SEO / Content Tools | SEO 与内容工具 | `seo-content-tools` | 14 | SEO 研究/审计/排名；排除泛 Marketing 套件母名 |
| P5-6 | Cloud Storage | 云存储 | `cloud-storage` | 14 | 云盘 / 文件同步分享；Watch 大厂锁榜 |
| P5-7 | Design & Prototyping Tools | 设计与原型工具 | `design-prototyping-tools` | 14 | UI/平面/原型；排除纯 AI 图像生成器（归 AI Image/Video） |
| P5-8 | Note-taking & Knowledge Base | 笔记与知识库 | `note-taking-knowledge-base` | 14 | 笔记 / 知识库；Notion 可与 PM 双上榜 |
| P5-9 | Email Marketing Tools | 邮件营销工具 | `email-marketing-tools` | 14 | 邮件/生命周期营销；从 Marketing Tools 切开 |
| P5-10 | HR Software | HR 软件 | `hr-software` | 14 | HRIS / 人事主数据；与 Recruiting Tools（ATS）划清，禁止整表互吞 |
| P5-11 | Workflow Automation | 工作流自动化 | `workflow-automation` | 14 | 无代码自动化（Zapier/Make/n8n）；与 Developer Tools 重叠可控 |

### 条目

#### P5-1 · Project Management Tools（项目管理工具）

- [x] P5-1：**新增** 品类 Project Management Tools（14 · `project-management-tools`）
- [x] P5-1-1：**新增** Prompt×8
- [x] P5-1-2：**补充** `08-10` 数据
  - [x] P5-1-2-1：**补充** `08-10` ChatGPT 数据
  - [x] P5-1-2-2：**补充** `08-10` Gemini 数据
  - [x] P5-1-2-3：**补充** `08-10` Grok 数据
  - [x] P5-1-2-4：**补充** `08-10` Perplexity 数据
  - [x] P5-1-2-5：**补充** `08-10` Claude 数据
  - [x] P5-1-2-6：**补充** `08-10` DeepSeek 数据
- [x] P5-1-3：**补充** `07-27` 数据
  - [x] P5-1-3-1：**补充** `07-27` ChatGPT 数据
  - [x] P5-1-3-2：**补充** `07-27` Gemini 数据
  - [x] P5-1-3-3：**补充** `07-27` Grok 数据
  - [x] P5-1-3-4：**补充** `07-27` Perplexity 数据
  - [x] P5-1-3-5：**补充** `07-27` Claude 数据
  - [x] P5-1-3-6：**补充** `07-27` DeepSeek 数据
- [x] P5-1-4：**补充** `07-13` 数据
  - [x] P5-1-4-1：**补充** `07-13` ChatGPT 数据
  - [x] P5-1-4-2：**补充** `07-13` Gemini 数据
  - [x] P5-1-4-3：**补充** `07-13` Grok 数据
  - [x] P5-1-4-4：**补充** `07-13` Perplexity 数据
  - [x] P5-1-4-5：**补充** `07-13` Claude 数据
  - [x] P5-1-4-6：**补充** `07-13` DeepSeek 数据
- [x] P5-1-5：**补充** `06-29` 数据
  - [x] P5-1-5-1：**补充** `06-29` ChatGPT 数据
  - [x] P5-1-5-2：**补充** `06-29` Gemini 数据
  - [x] P5-1-5-3：**补充** `06-29` Grok 数据
  - [x] P5-1-5-4：**补充** `06-29` Perplexity 数据
  - [x] P5-1-5-5：**补充** `06-29` Claude 数据
  - [x] P5-1-5-6：**补充** `06-29` DeepSeek 数据

#### P5-2 · CRM Platforms（客户关系管理）

- [x] P5-2：**新增** 品类 CRM Platforms（14 · `crm-platforms`）
- [x] P5-2-1：**新增** Prompt×8
- [x] P5-2-2：**补充** `08-10` 数据
  - [x] P5-2-2-1：**补充** `08-10` ChatGPT 数据
  - [x] P5-2-2-2：**补充** `08-10` Gemini 数据
  - [x] P5-2-2-3：**补充** `08-10` Grok 数据
  - [x] P5-2-2-4：**补充** `08-10` Perplexity 数据
  - [x] P5-2-2-5：**补充** `08-10` Claude 数据
  - [x] P5-2-2-6：**补充** `08-10` DeepSeek 数据
- [x] P5-2-3：**补充** `07-27` 数据
  - [x] P5-2-3-1：**补充** `07-27` ChatGPT 数据
  - [x] P5-2-3-2：**补充** `07-27` Gemini 数据
  - [x] P5-2-3-3：**补充** `07-27` Grok 数据
  - [x] P5-2-3-4：**补充** `07-27` Perplexity 数据
  - [x] P5-2-3-5：**补充** `07-27` Claude 数据
  - [x] P5-2-3-6：**补充** `07-27` DeepSeek 数据
- [x] P5-2-4：**补充** `07-13` 数据
  - [x] P5-2-4-1：**补充** `07-13` ChatGPT 数据
  - [x] P5-2-4-2：**补充** `07-13` Gemini 数据
  - [x] P5-2-4-3：**补充** `07-13` Grok 数据
  - [x] P5-2-4-4：**补充** `07-13` Perplexity 数据
  - [x] P5-2-4-5：**补充** `07-13` Claude 数据
  - [x] P5-2-4-6：**补充** `07-13` DeepSeek 数据
- [x] P5-2-5：**补充** `06-29` 数据
  - [x] P5-2-5-1：**补充** `06-29` ChatGPT 数据
  - [x] P5-2-5-2：**补充** `06-29` Gemini 数据
  - [x] P5-2-5-3：**补充** `06-29` Grok 数据
  - [x] P5-2-5-4：**补充** `06-29` Perplexity 数据
  - [x] P5-2-5-5：**补充** `06-29` Claude 数据
  - [x] P5-2-5-6：**补充** `06-29` DeepSeek 数据

#### P5-3 · Customer Support / Helpdesk（客服与工单系统）

- [x] P5-3：**新增** 品类 Customer Support / Helpdesk（14 · `customer-support-helpdesk`）
- [x] P5-3-1：**新增** Prompt×8
- [x] P5-3-2：**补充** `08-10` 数据
  - [x] P5-3-2-1：**补充** `08-10` ChatGPT 数据
  - [x] P5-3-2-2：**补充** `08-10` Gemini 数据
  - [x] P5-3-2-3：**补充** `08-10` Grok 数据
  - [x] P5-3-2-4：**补充** `08-10` Perplexity 数据
  - [x] P5-3-2-5：**补充** `08-10` Claude 数据
  - [x] P5-3-2-6：**补充** `08-10` DeepSeek 数据
- [x] P5-3-3：**补充** `07-27` 数据
  - [x] P5-3-3-1：**补充** `07-27` ChatGPT 数据
  - [x] P5-3-3-2：**补充** `07-27` Gemini 数据
  - [x] P5-3-3-3：**补充** `07-27` Grok 数据
  - [x] P5-3-3-4：**补充** `07-27` Perplexity 数据
  - [x] P5-3-3-5：**补充** `07-27` Claude 数据
  - [x] P5-3-3-6：**补充** `07-27` DeepSeek 数据
- [x] P5-3-4：**补充** `07-13` 数据
  - [x] P5-3-4-1：**补充** `07-13` ChatGPT 数据
  - [x] P5-3-4-2：**补充** `07-13` Gemini 数据
  - [x] P5-3-4-3：**补充** `07-13` Grok 数据
  - [x] P5-3-4-4：**补充** `07-13` Perplexity 数据
  - [x] P5-3-4-5：**补充** `07-13` Claude 数据
  - [x] P5-3-4-6：**补充** `07-13` DeepSeek 数据
- [x] P5-3-5：**补充** `06-29` 数据
  - [x] P5-3-5-1：**补充** `06-29` ChatGPT 数据
  - [x] P5-3-5-2：**补充** `06-29` Gemini 数据
  - [x] P5-3-5-3：**补充** `06-29` Grok 数据
  - [x] P5-3-5-4：**补充** `06-29` Perplexity 数据
  - [x] P5-3-5-5：**补充** `06-29` Claude 数据
  - [x] P5-3-5-6：**补充** `06-29` DeepSeek 数据

#### P5-4 · Accounting & Invoicing Software（会计与发票软件）

- [x] P5-4：**新增** 品类 Accounting & Invoicing Software（14 · `accounting-invoicing-software`）
- [x] P5-4-1：**新增** Prompt×8
- [x] P5-4-2：**补充** `08-10` 数据
  - [x] P5-4-2-1：**补充** `08-10` ChatGPT 数据
  - [x] P5-4-2-2：**补充** `08-10` Gemini 数据
  - [x] P5-4-2-3：**补充** `08-10` Grok 数据
  - [x] P5-4-2-4：**补充** `08-10` Perplexity 数据
  - [x] P5-4-2-5：**补充** `08-10` Claude 数据
  - [x] P5-4-2-6：**补充** `08-10` DeepSeek 数据
- [x] P5-4-3：**补充** `07-27` 数据
  - [x] P5-4-3-1：**补充** `07-27` ChatGPT 数据
  - [x] P5-4-3-2：**补充** `07-27` Gemini 数据
  - [x] P5-4-3-3：**补充** `07-27` Grok 数据
  - [x] P5-4-3-4：**补充** `07-27` Perplexity 数据
  - [x] P5-4-3-5：**补充** `07-27` Claude 数据
  - [x] P5-4-3-6：**补充** `07-27` DeepSeek 数据
- [x] P5-4-4：**补充** `07-13` 数据
  - [x] P5-4-4-1：**补充** `07-13` ChatGPT 数据
  - [x] P5-4-4-2：**补充** `07-13` Gemini 数据
  - [x] P5-4-4-3：**补充** `07-13` Grok 数据
  - [x] P5-4-4-4：**补充** `07-13` Perplexity 数据
  - [x] P5-4-4-5：**补充** `07-13` Claude 数据
  - [x] P5-4-4-6：**补充** `07-13` DeepSeek 数据
- [x] P5-4-5：**补充** `06-29` 数据
  - [x] P5-4-5-1：**补充** `06-29` ChatGPT 数据
  - [x] P5-4-5-2：**补充** `06-29` Gemini 数据
  - [x] P5-4-5-3：**补充** `06-29` Grok 数据
  - [x] P5-4-5-4：**补充** `06-29` Perplexity 数据
  - [x] P5-4-5-5：**补充** `06-29` Claude 数据
  - [x] P5-4-5-6：**补充** `06-29` DeepSeek 数据

#### P5-5 · SEO / Content Tools（SEO 与内容工具）

- [x] P5-5：**新增** 品类 SEO / Content Tools（14 · `seo-content-tools`）
- [x] P5-5-1：**新增** Prompt×8
- [x] P5-5-2：**补充** `08-10` 数据
  - [x] P5-5-2-1：**补充** `08-10` ChatGPT 数据
  - [x] P5-5-2-2：**补充** `08-10` Gemini 数据
  - [x] P5-5-2-3：**补充** `08-10` Grok 数据
  - [x] P5-5-2-4：**补充** `08-10` Perplexity 数据
  - [x] P5-5-2-5：**补充** `08-10` Claude 数据
  - [x] P5-5-2-6：**补充** `08-10` DeepSeek 数据
- [x] P5-5-3：**补充** `07-27` 数据
  - [x] P5-5-3-1：**补充** `07-27` ChatGPT 数据
  - [x] P5-5-3-2：**补充** `07-27` Gemini 数据
  - [x] P5-5-3-3：**补充** `07-27` Grok 数据
  - [x] P5-5-3-4：**补充** `07-27` Perplexity 数据
  - [x] P5-5-3-5：**补充** `07-27` Claude 数据
  - [x] P5-5-3-6：**补充** `07-27` DeepSeek 数据
- [x] P5-5-4：**补充** `07-13` 数据
  - [x] P5-5-4-1：**补充** `07-13` ChatGPT 数据
  - [x] P5-5-4-2：**补充** `07-13` Gemini 数据
  - [x] P5-5-4-3：**补充** `07-13` Grok 数据
  - [x] P5-5-4-4：**补充** `07-13` Perplexity 数据
  - [x] P5-5-4-5：**补充** `07-13` Claude 数据
  - [x] P5-5-4-6：**补充** `07-13` DeepSeek 数据
- [x] P5-5-5：**补充** `06-29` 数据
  - [x] P5-5-5-1：**补充** `06-29` ChatGPT 数据
  - [x] P5-5-5-2：**补充** `06-29` Gemini 数据
  - [x] P5-5-5-3：**补充** `06-29` Grok 数据
  - [x] P5-5-5-4：**补充** `06-29` Perplexity 数据
  - [x] P5-5-5-5：**补充** `06-29` Claude 数据
  - [x] P5-5-5-6：**补充** `06-29` DeepSeek 数据

#### P5-6 · Cloud Storage（云存储）

- [x] P5-6：**新增** 品类 Cloud Storage（14 · `cloud-storage`）
- [x] P5-6-1：**新增** Prompt×8
- [x] P5-6-2：**补充** `08-10` 数据
  - [x] P5-6-2-1：**补充** `08-10` ChatGPT 数据
  - [x] P5-6-2-2：**补充** `08-10` Gemini 数据
  - [x] P5-6-2-3：**补充** `08-10` Grok 数据
  - [x] P5-6-2-4：**补充** `08-10` Perplexity 数据
  - [x] P5-6-2-5：**补充** `08-10` Claude 数据
  - [x] P5-6-2-6：**补充** `08-10` DeepSeek 数据
- [x] P5-6-3：**补充** `07-27` 数据
  - [x] P5-6-3-1：**补充** `07-27` ChatGPT 数据
  - [x] P5-6-3-2：**补充** `07-27` Gemini 数据
  - [x] P5-6-3-3：**补充** `07-27` Grok 数据
  - [x] P5-6-3-4：**补充** `07-27` Perplexity 数据
  - [x] P5-6-3-5：**补充** `07-27` Claude 数据
  - [x] P5-6-3-6：**补充** `07-27` DeepSeek 数据
- [x] P5-6-4：**补充** `07-13` 数据
  - [x] P5-6-4-1：**补充** `07-13` ChatGPT 数据
  - [x] P5-6-4-2：**补充** `07-13` Gemini 数据
  - [x] P5-6-4-3：**补充** `07-13` Grok 数据
  - [x] P5-6-4-4：**补充** `07-13` Perplexity 数据
  - [x] P5-6-4-5：**补充** `07-13` Claude 数据
  - [x] P5-6-4-6：**补充** `07-13` DeepSeek 数据
- [x] P5-6-5：**补充** `06-29` 数据
  - [x] P5-6-5-1：**补充** `06-29` ChatGPT 数据
  - [x] P5-6-5-2：**补充** `06-29` Gemini 数据
  - [x] P5-6-5-3：**补充** `06-29` Grok 数据
  - [x] P5-6-5-4：**补充** `06-29` Perplexity 数据
  - [x] P5-6-5-5：**补充** `06-29` Claude 数据
  - [x] P5-6-5-6：**补充** `06-29` DeepSeek 数据

#### P5-7 · Design & Prototyping Tools（设计与原型工具）

- [x] P5-7：**新增** 品类 Design & Prototyping Tools（14 · `design-prototyping-tools`）
- [x] P5-7-1：**新增** Prompt×8
- [x] P5-7-2：**补充** `08-10` 数据
  - [x] P5-7-2-1：**补充** `08-10` ChatGPT 数据
  - [x] P5-7-2-2：**补充** `08-10` Gemini 数据
  - [x] P5-7-2-3：**补充** `08-10` Grok 数据
  - [x] P5-7-2-4：**补充** `08-10` Perplexity 数据
  - [x] P5-7-2-5：**补充** `08-10` Claude 数据
  - [x] P5-7-2-6：**补充** `08-10` DeepSeek 数据
- [x] P5-7-3：**补充** `07-27` 数据
  - [x] P5-7-3-1：**补充** `07-27` ChatGPT 数据
  - [x] P5-7-3-2：**补充** `07-27` Gemini 数据
  - [x] P5-7-3-3：**补充** `07-27` Grok 数据
  - [x] P5-7-3-4：**补充** `07-27` Perplexity 数据
  - [x] P5-7-3-5：**补充** `07-27` Claude 数据
  - [x] P5-7-3-6：**补充** `07-27` DeepSeek 数据
- [x] P5-7-4：**补充** `07-13` 数据
  - [x] P5-7-4-1：**补充** `07-13` ChatGPT 数据
  - [x] P5-7-4-2：**补充** `07-13` Gemini 数据
  - [x] P5-7-4-3：**补充** `07-13` Grok 数据
  - [x] P5-7-4-4：**补充** `07-13` Perplexity 数据
  - [x] P5-7-4-5：**补充** `07-13` Claude 数据
  - [x] P5-7-4-6：**补充** `07-13` DeepSeek 数据
- [x] P5-7-5：**补充** `06-29` 数据
  - [x] P5-7-5-1：**补充** `06-29` ChatGPT 数据
  - [x] P5-7-5-2：**补充** `06-29` Gemini 数据
  - [x] P5-7-5-3：**补充** `06-29` Grok 数据
  - [x] P5-7-5-4：**补充** `06-29` Perplexity 数据
  - [x] P5-7-5-5：**补充** `06-29` Claude 数据
  - [x] P5-7-5-6：**补充** `06-29` DeepSeek 数据

#### P5-8 · Note-taking & Knowledge Base（笔记与知识库）

- [x] P5-8：**新增** 品类 Note-taking & Knowledge Base（14 · `note-taking-knowledge-base`）
- [x] P5-8-1：**新增** Prompt×8
- [x] P5-8-2：**补充** `08-10` 数据
  - [x] P5-8-2-1：**补充** `08-10` ChatGPT 数据
  - [x] P5-8-2-2：**补充** `08-10` Gemini 数据
  - [x] P5-8-2-3：**补充** `08-10` Grok 数据
  - [x] P5-8-2-4：**补充** `08-10` Perplexity 数据
  - [x] P5-8-2-5：**补充** `08-10` Claude 数据
  - [x] P5-8-2-6：**补充** `08-10` DeepSeek 数据
- [x] P5-8-3：**补充** `07-27` 数据
  - [x] P5-8-3-1：**补充** `07-27` ChatGPT 数据
  - [x] P5-8-3-2：**补充** `07-27` Gemini 数据
  - [x] P5-8-3-3：**补充** `07-27` Grok 数据
  - [x] P5-8-3-4：**补充** `07-27` Perplexity 数据
  - [x] P5-8-3-5：**补充** `07-27` Claude 数据
  - [x] P5-8-3-6：**补充** `07-27` DeepSeek 数据
- [x] P5-8-4：**补充** `07-13` 数据
  - [x] P5-8-4-1：**补充** `07-13` ChatGPT 数据
  - [x] P5-8-4-2：**补充** `07-13` Gemini 数据
  - [x] P5-8-4-3：**补充** `07-13` Grok 数据
  - [x] P5-8-4-4：**补充** `07-13` Perplexity 数据
  - [x] P5-8-4-5：**补充** `07-13` Claude 数据
  - [x] P5-8-4-6：**补充** `07-13` DeepSeek 数据
- [x] P5-8-5：**补充** `06-29` 数据
  - [x] P5-8-5-1：**补充** `06-29` ChatGPT 数据
  - [x] P5-8-5-2：**补充** `06-29` Gemini 数据
  - [x] P5-8-5-3：**补充** `06-29` Grok 数据
  - [x] P5-8-5-4：**补充** `06-29` Perplexity 数据
  - [x] P5-8-5-5：**补充** `06-29` Claude 数据
  - [x] P5-8-5-6：**补充** `06-29` DeepSeek 数据

#### P5-9 · Email Marketing Tools（邮件营销工具）

- [x] P5-9：**新增** 品类 Email Marketing Tools（14 · `email-marketing-tools`）
- [x] P5-9-1：**新增** Prompt×8
- [x] P5-9-2：**补充** `08-10` 数据
  - [x] P5-9-2-1：**补充** `08-10` ChatGPT 数据
  - [x] P5-9-2-2：**补充** `08-10` Gemini 数据
  - [x] P5-9-2-3：**补充** `08-10` Grok 数据
  - [x] P5-9-2-4：**补充** `08-10` Perplexity 数据
  - [x] P5-9-2-5：**补充** `08-10` Claude 数据
  - [x] P5-9-2-6：**补充** `08-10` DeepSeek 数据
- [x] P5-9-3：**补充** `07-27` 数据
  - [x] P5-9-3-1：**补充** `07-27` ChatGPT 数据
  - [x] P5-9-3-2：**补充** `07-27` Gemini 数据
  - [x] P5-9-3-3：**补充** `07-27` Grok 数据
  - [x] P5-9-3-4：**补充** `07-27` Perplexity 数据
  - [x] P5-9-3-5：**补充** `07-27` Claude 数据
  - [x] P5-9-3-6：**补充** `07-27` DeepSeek 数据
- [x] P5-9-4：**补充** `07-13` 数据
  - [x] P5-9-4-1：**补充** `07-13` ChatGPT 数据
  - [x] P5-9-4-2：**补充** `07-13` Gemini 数据
  - [x] P5-9-4-3：**补充** `07-13` Grok 数据
  - [x] P5-9-4-4：**补充** `07-13` Perplexity 数据
  - [x] P5-9-4-5：**补充** `07-13` Claude 数据
  - [x] P5-9-4-6：**补充** `07-13` DeepSeek 数据
- [x] P5-9-5：**补充** `06-29` 数据
  - [x] P5-9-5-1：**补充** `06-29` ChatGPT 数据
  - [x] P5-9-5-2：**补充** `06-29` Gemini 数据
  - [x] P5-9-5-3：**补充** `06-29` Grok 数据
  - [x] P5-9-5-4：**补充** `06-29` Perplexity 数据
  - [x] P5-9-5-5：**补充** `06-29` Claude 数据
  - [x] P5-9-5-6：**补充** `06-29` DeepSeek 数据

#### P5-10 · HR Software（HR 软件）

- [x] P5-10：**新增** 品类 HR Software（14 · `hr-software`）；口径与 Recruiting（ATS）划清
- [x] P5-10-1：**新增** Prompt×8
- [x] P5-10-2：**补充** `08-10` 数据
  - [x] P5-10-2-1：**补充** `08-10` ChatGPT 数据
  - [x] P5-10-2-2：**补充** `08-10` Gemini 数据
  - [x] P5-10-2-3：**补充** `08-10` Grok 数据
  - [x] P5-10-2-4：**补充** `08-10` Perplexity 数据
  - [x] P5-10-2-5：**补充** `08-10` Claude 数据
  - [x] P5-10-2-6：**补充** `08-10` DeepSeek 数据
- [x] P5-10-3：**补充** `07-27` 数据
  - [x] P5-10-3-1：**补充** `07-27` ChatGPT 数据
  - [x] P5-10-3-2：**补充** `07-27` Gemini 数据
  - [x] P5-10-3-3：**补充** `07-27` Grok 数据
  - [x] P5-10-3-4：**补充** `07-27` Perplexity 数据
  - [x] P5-10-3-5：**补充** `07-27` Claude 数据
  - [x] P5-10-3-6：**补充** `07-27` DeepSeek 数据
- [x] P5-10-4：**补充** `07-13` 数据
  - [x] P5-10-4-1：**补充** `07-13` ChatGPT 数据
  - [x] P5-10-4-2：**补充** `07-13` Gemini 数据
  - [x] P5-10-4-3：**补充** `07-13` Grok 数据
  - [x] P5-10-4-4：**补充** `07-13` Perplexity 数据
  - [x] P5-10-4-5：**补充** `07-13` Claude 数据
  - [x] P5-10-4-6：**补充** `07-13` DeepSeek 数据
- [x] P5-10-5：**补充** `06-29` 数据
  - [x] P5-10-5-1：**补充** `06-29` ChatGPT 数据
  - [x] P5-10-5-2：**补充** `06-29` Gemini 数据
  - [x] P5-10-5-3：**补充** `06-29` Grok 数据
  - [x] P5-10-5-4：**补充** `06-29` Perplexity 数据
  - [x] P5-10-5-5：**补充** `06-29` Claude 数据
  - [x] P5-10-5-6：**补充** `06-29` DeepSeek 数据

#### P5-11 · Workflow Automation（工作流自动化）

- [x] P5-11：**新增** 品类 Workflow Automation（14 · `workflow-automation`）
- [x] P5-11-1：**新增** Prompt×8
- [x] P5-11-2：**补充** `08-10` 数据
  - [x] P5-11-2-1：**补充** `08-10` ChatGPT 数据
  - [x] P5-11-2-2：**补充** `08-10` Gemini 数据
  - [x] P5-11-2-3：**补充** `08-10` Grok 数据
  - [x] P5-11-2-4：**补充** `08-10` Perplexity 数据
  - [x] P5-11-2-5：**补充** `08-10` Claude 数据
  - [x] P5-11-2-6：**补充** `08-10` DeepSeek 数据
- [x] P5-11-3：**补充** `07-27` 数据
  - [x] P5-11-3-1：**补充** `07-27` ChatGPT 数据
  - [x] P5-11-3-2：**补充** `07-27` Gemini 数据
  - [x] P5-11-3-3：**补充** `07-27` Grok 数据
  - [x] P5-11-3-4：**补充** `07-27` Perplexity 数据
  - [x] P5-11-3-5：**补充** `07-27` Claude 数据
  - [x] P5-11-3-6：**补充** `07-27` DeepSeek 数据
- [x] P5-11-4：**补充** `07-13` 数据
  - [x] P5-11-4-1：**补充** `07-13` ChatGPT 数据
  - [x] P5-11-4-2：**补充** `07-13` Gemini 数据
  - [x] P5-11-4-3：**补充** `07-13` Grok 数据
  - [x] P5-11-4-4：**补充** `07-13` Perplexity 数据
  - [x] P5-11-4-5：**补充** `07-13` Claude 数据
  - [x] P5-11-4-6：**补充** `07-13` DeepSeek 数据
- [x] P5-11-5：**补充** `06-29` 数据
  - [x] P5-11-5-1：**补充** `06-29` ChatGPT 数据
  - [x] P5-11-5-2：**补充** `06-29` Gemini 数据
  - [x] P5-11-5-3：**补充** `06-29` Grok 数据
  - [x] P5-11-5-4：**补充** `06-29` Perplexity 数据
  - [x] P5-11-5-5：**补充** `06-29` Claude 数据
  - [x] P5-11-5-6：**补充** `06-29` DeepSeek 数据

#### 全局约束

- [x] P5-12：**约束** Top 20 须有 Brand Page；exclude 只限本品类；首页/榜单品类列表同源；临近 4 档齐后发布（launch-gate 2026-08-16 四档全绿；HR ATS exclude 已落）

## P6 · 实体质量 / 榜单可信度（全品类）

> 2026-08-17 审计：AI Image / Video 已做实体归并 + 6 周期 force 重算（Leonardo.ai ≠ SAP Leonardo、DALL·E 不再灌 ChatGPT、版本串归母品牌）。**其他品类同类污染仍在**；已禁用实体若未 rescore，旧 Top20 snapshot 仍会展示（如 HR Software #3 仍为 SAP Leonardo）。

### 背景（现象）

1. **单次第 1 刷分**：`appearance ≈ 2%` + `avgRank = 1` → Overall ≈ 42.7，挤进 Top20。最新 Overall 约 150+ 条 appearance < 8% 的行；Cyber / Meeting / CRM / AI Tools / Accounting / Design 等重灾。
2. **版本 / SKU / 斜杠拼盘未归母品牌**：如 `Otter.ai Pro Max`、`Fireflies.ai 3.0`、`Shopify/Shopify Plus`、`CrowdStrike Falcon / Charlotte AI`、`Fin AI 3.0`。库内 `rankingEnabled` 且名字像版本/拼盘的 brand 数百条。
3. **错误 alias / consolidate**：历史 review_queue alias 把无关产品并到错误 Brand；`preprocessBrand` 剥 `.ai` 加剧碰撞（Leonardo 样例）。

### 优先级

#### P6-0 · 全品类 force rescore（先做）

- [x] P6-0：**修复** 对所有已发布品类 × 已有周期 `scoreCategory(..., { force: true })`（或等价全量 reprocess），使 `rankingEnabled=false` / 已 merge 的实体立刻从 Top20 消失。（2026-08-17：115 个 category×week 已 force 重算）
- [x] P6-0-1：**验收** HR Software 最新档不再出现 SAP Leonardo；Recruiting / SaaS 历史档同类残留消失。
- [x] P6-0-2：**验收** AI Image 修后 Top20 形态在 rescore 后仍保持（回归抽查）。

#### P6-1 · 批量实体归并（SKU / 斜杠串 → 母产品）

- [x] P6-1：**新增** `brand-canonical` / `entity-audit` 高频 merge 规则（按品类扫 Top20 + Also mentioned）。
- [x] P6-1-1：**合并** Meeting：`Otter.ai Pro Max` → Otter；`Fireflies.ai 3.0` → Fireflies；同类 SKU。
- [x] P6-1-2：**合并** E-commerce：`Shopify/Shopify Plus`、`Shopify V2` → Shopify。
- [x] P6-1-3：**合并** Cyber：CrowdStrike / Charlotte / Falcon 拼盘 → 主产品线；Defender 拼盘 → Microsoft Defender（或约定口径）。
- [x] P6-1-4：**合并** Helpdesk / CRM / Design / Dev / PM：斜杠双产品、Fin AI 3.0、Adobe XD/CC 拼盘等按母产品归并。
- [x] P6-1-5：**修复** consolidate **禁止**用 BrandAlias 合并 Brand 行（仅 normalize 解析 raw）；preferredCanonical 优先于脏 alias（AI Image 已落地，全链路确认）。
- [x] P6-1-6：**约束** 版本 / model SKU：`rankingEnabled=false`，parent → 母产品；新 `auto_new` 命中规则表时不得单独上榜。
- [x] P6-1-7：**执行** merge 后再次全品类 force rescore + 抽查各 family 代表品类 Top20。

#### P6-2 · Overall 入榜门槛（评分 / 发布规则）

- [x] P6-2：**新增** Overall Top N 最低门槛：appearance ≥ 10%，**或** 当周期 ≥ 2 个计分引擎提及（`OVERALL_MIN_APPEARANCE_RATE` / `OVERALL_MIN_SCORING_ENGINES`，`SCORING_VERSION=3`）。
- [x] P6-2-1：**文档** methodology / Tooltip 同步门槛说明（中英）。
- [x] P6-2-2：**验收** 单次第 1 幽灵行不再占据 Top20 中段；Also mentioned 可承接未达门槛实体。

### 不做（本块范围外）

- 不重采引擎原始 response（只修解析 / 归并 / 计分 / 门槛）。
- 不把 GEO Audit / 邮件监控混进本块（见 [PRD-phase-next](../PRD-phase-next.md) N1–N3）。
