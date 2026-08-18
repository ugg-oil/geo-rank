# GEO Radar：第六阶段 PRD

> v1.6 · **草案**。基线 [phase-5](../phase-5/PRD-phase-5.md)（v1.5 已发布）。事故事实：[weekly-pipeline-incidents.md](../../incidents/weekly-pipeline-incidents.md)。未进本阶段的想法仍放 [phase-next](../PRD-phase-next.md)。品类 [category-selection](../category-selection.md)。

| 字段 | 内容 |
|------|------|
| 产品 | GEO Radar |
| 阶段 | Phase 6 · v1.5 → v1.6 |
| 状态 | 草案 · 未开始 |
| 文档 | 中文 · 网站英文 |
| 起草 | 2026-08-18（Week of 2026-08-17 人工救火收工当天） |

## 为什么现在做这个阶段

v1.5 把 24 品类、页面和实体门槛做出来了，但 **连续三个周一的周更都没按计划自己跑完**：

| 周次 | 卡点 | 人做了什么 |
|------|------|------------|
| 08-03 | collecting 无超时；normalize 超时；Blob `latest` 不覆盖 | 重试 + 发布补丁 |
| 08-10 | 步进 tick 停在 collecting | 人工补采 5 核心品类 |
| 08-17 | DeepSeek 挡 extract；之后 classifying / publishing 空转 | 门槛跳过 DeepSeek；人工 catchup；部署后处理连跑 |

08-17 收工状态：`pipeline_runs` `success`、643 snapshots、前台已是本周；Blob 镜像仍 skip。前台能看榜 ≠ 管道可信。本阶段先把「周一不用人盯」做实，再加一个真正能兑现的产品入口（Watch）。

## 顺序

```text
P0  周更 SLA / 管道收口     周一 due 品类必须自动发布；禁止 snapshots 齐了还挂 running
P1  卡住要能看见、要告警    别再靠聊天里贴 CRON_SECRET 去 curl
P2  采集尾巴与引擎分榜      DeepSeek 长尾；分榜空态不能装成「没人提」
P3  7 天 / 14 天周期话术    首页像全站更新，实际只有 5 个 7 天品类 due
P4  Watch 邮件监控          现有 CTA 像监控，实际是销售线索表
P5  实体质量周流程          不能再靠一次性全库 rescore
```

## 全站约束（本阶段）

- 对外仍 **period / 采集周期**，日期 `YYYY-MM-DD`；禁止 week / Weekly。
- 前台 SoT 仍是 DB `snapshots`；不把 Blob 镜像做成发布硬条件。
- 不新开引擎（Copilot / Kimi）、不新开品类。6 个引擎都跑不稳，先别加第 7 个。
- 不把 GEO Audit 混进 Watch CTA（N3 仍在 phase-next）。
- Hobby 上 `after()` 仍不可靠；自链只是加速，**小时 catchup 才是续跑保证**。

## 已落地（本阶段基线，不当作新需求）

08-18 已上线，验收见事故文档：

- 采集门槛：每 due 品类 ≥3 完整引擎即可进 extract，不等 DeepSeek。
- catchup 入口只读 `pipeline_runs`；`getPipelineHealth` 在 tick `done` 之后。
- 后处理同一 tick 连跑；extract/score 中途心跳。
- `collectOne` 失败重试上限；新 run 从第一个未完成引擎起。

本阶段补的是：**这些修完之后仍然发生的洞**（publishing 挂着、health 与前台不一致、无告警、DeepSeek 分榜空洞、周期话术、假监控 CTA）。

---

## P0 · 周更 SLA / 管道收口

**事实：** 08-18 12:59 UTC 前，run `cmsy053qd000004jxcysqwp2p` 已有 **643 snapshots**，前台 Category 页 `week` 已是 `Week of 2026-08-17`，但 `pipeline_runs.status=running`、`currentStep=publishing`、心跳停在 11:35 UTC。health 503。人工 catchup **2.2s** 把 publishing（Blob skip）收成 `success`。

### 目标

due 品类的 Overall Top20 在周一窗口内自动可读；snapshots 已齐时 run 必须在当次 tick 收成，禁止再靠人 poke。

- [ ] P0-1：**新增** 发布 SLA：每个自然周，**本周 due 品类**（`shouldCollectCategoryInPeriod`）在周一 UTC 06:00（日级 catchup）前须有 Overall Top20；未齐发告警。7 天品类每周 due；14 天品类只在对齐周考核。
- [ ] P0-2：**修复** health 与前台对齐：若本周 due 品类 snapshots 已齐且前台可读，`getPipelineHealth` 不得因 `status=running` + `currentStep=publishing` 判失败。建议：snapshots 门槛满足 → `ok` 或 `ok`+warning `run_not_finalized`；`running` 只在 **还没有可读榜** 时打红。
- [ ] P0-3：**修复** `publishing` 收口：`snapshotCount > 0` 且镜像 skip/failed_mirror 时，本 tick **必须** 写 `status=success` + `finishedAt`。禁止 snapshots 已齐还把 run 留在 `publishing` 空转（08-18 实测 80+ 分钟）。
- [ ] P0-4：**新增** extract 软截止：对齐 collect。`PIPELINE_TICK_BUDGET_MS` 用尽停在 `extracting`，已写入的 mentions 保留，下 tick 续；禁止 20 分钟硬超时把整 run 标 failed。
- [ ] P0-5：**修复** score 半截品类：`scoreCategory` 中途被平台掐死时，不得留下「已有 snapshot 行 → 下 tick 整类 skip」的半成品。按品类事务或完成后才可见。
- [ ] P0-6：**验收** 下一个 due 周一：不人工 curl catchup，前台 due 品类切到新周期；`pipeline_runs` 最终 `success`。失败则本条不勾。

## P1 · 卡住要能看见、要告警

**事实：** classifying 空转 40 分钟、publishing 空转 ~80 分钟，Resend 告警没把人叫起来。排障方式是聊天贴 `CRON_SECRET` 打 health。

- [ ] P1-1：**新增** 鉴权只读状态页（或扩 `/api/pipeline-health`）：week、run id、`currentStep`、心跳年龄、collected / extracted / snapshots、due 品类覆盖。给自己看，不给访客。
- [ ] P1-2：**新增** 卡住告警：`running` 且心跳 ≥ 15 分钟，且当前步不是「采集软预算内的 collecting」→ 邮件。classifying / publishing 这种秒级步超时必须告。已有 `PIPELINE_ALERT_EMAIL_*`，这次没用上。
- [ ] P1-3：**新增** catchup 跳过原因进告警/状态：`already_running` 时带心跳年龄和 step，避免「看起来在跑其实死了」。
- [ ] P1-4：**约束** 密钥只放 Vercel / GitHub Actions；文档禁止把 secret 写进聊天或仓库。轮换 08-18 已暴露的 `CRON_SECRET`（Vercel + GHA 同步）。

## P2 · 采集尾巴与引擎分榜

**事实：** 08-17 因 DeepSeek 卡住。门槛跳过后 Overall 能发，但 DeepSeek 在 Meeting / Cyber **0/8**，Marketing **2/8**。引擎 Tab 会像「这周期没人提」，其实是没采完。

- [ ] P2-1：**变更** DeepSeek 为 best-effort：不挡 Overall（已是）；超时/失败在 run 摘要里记 `engineIncomplete`，不靠「看起来像空榜」。
- [ ] P2-2：**新增** 引擎分榜空态：该引擎本周期 ok responses < 品类 active prompts → 文案「本周期该引擎采集未完成」，禁止用空 Top20 冒充零提及。
- [ ] P2-3：**新增** 采集覆盖摘要（可只在状态页）：品类 × 引擎 `ok / expected`。08-17 若当时有这张表，不用翻 DB。
- [ ] P2-4：**不做** 本阶段接入 Copilot / Kimi。

## P3 · 7 天 / 14 天周期话术

**事实：** 08-17 只有 5 个 7 天品类 due（AI Tools / Image / Marketing / Meeting / Cyber）。14 天品类仍停在 08-10。首页 Hero「Period start · 2026-08-17」+ Movers 会让人以为 24 个品类都更新了。

- [ ] P3-1：**变更** 首页标明范围：本周期更新的是哪些品类（或「N 个品类本周期已更新」），14 天品类显示其真实周期起始日，不跟 7 天品类混成一个「全站最新」。
- [ ] P3-2：**变更** `/rankings` 品类卡带「最近更新 YYYY-MM-DD」；过期未 due 不显示成 NEW。
- [ ] P3-3：**文档** operations：周一 checklist 写清 due 集合怎么算；14 天品类对齐周才考核 P0-1。

## P4 · Watch 邮件监控

**事实：** Brand / Category 上的 CTA 语义是监控可见度，表单却是 `track_brand` / `geo_audit` 线索。周更现在能发榜了，这个入口再不兑现就是假的。需求骨架已在 [phase-next N1](../PRD-phase-next.md)；本阶段只做最小 Watch。

- [ ] P4-1：**新增** 订阅对象来自当前页（品牌或品类），邮箱 + 验证邮件；确认后生效。
- [ ] P4-2：**新增** 每周期最多一封：排名 / 是否跌出 Top20 / 可选显著 Δ；邮件内退订。
- [ ] P4-3：**变更** Brand 主 CTA 从线索表换成 Watch；GEO Audit 不得当主按钮（N3 仍后期）。
- [ ] P4-4：**约束** 不做账号体系、不做站内「我的监控列表」、不收集 Website / 销售意向。
- [ ] P4-5：**验收** 用真实邮箱走通：验证 → 下一 due 周期收到一封 → 退订失效。

## P5 · 实体质量周流程

**事实：** phase-5 P6 一次性 merge + 115 次 force rescore 把当时的 SKU / 幽灵行清了。每周 `auto_new` 仍会进榜；Review Queue 没有「发布后必扫」节奏，问题会再堆到要全库重打分。

- [ ] P5-1：**新增** 每周发布后扫描：新进 Overall Top20 / Also mentioned 且 `entityTypeSource=rule` 的品牌列表（run 级日志或状态页）。
- [ ] P5-2：**变更** 命中 SKU / 斜杠 / 版本规则的新 brand 默认 `rankingEnabled=false`，进 Queue，不进下一周期 Overall（规则表已有，缺的是默认路径）。
- [ ] P5-3：**约束** 不把「再跑一次全品类 force rescore」当常规操作；只允许规则变更后的定向重打。

---

## 不做（本阶段）

- 新品类、新引擎、Blob 强制镜像、R2。
- GEO Audit 独立入口（N3）、账号、付费墙、CSV/PDF 导出。
- 对比页大改（品类页 2–3 产品对比已有）；可分享 URL 对比放到 phase-next。
- 重采 08-17 DeepSeek 空洞（除非 P2 做完且成本可接受）。

## 过线标准

1. 下一个 due 周一不靠人工 poke，due 品类前台切新周期（P0-6）。
2. snapshots 已齐时 health 不再因 publishing 空转报红（P0-2 / P0-3）。
3. 引擎未采完有明确空态，不以空榜冒充零提及（P2-2）。
4. Watch 最小闭环可退订（P4-5）。
