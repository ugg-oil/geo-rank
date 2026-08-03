# 2026-08-03 周更 Pipeline 事故分析

**状态：已恢复**  
**影响周次：** `Week of 2026-08-03`  
**影响时间（北京时间）：** 10:04–18:17  
**严重度：** SEV-2（本周榜单未能按计划完成发布；站点在恢复前继续展示上一周数据）

## 摘要

2026-08-03（周一）的自动周更未能在首次运行中完成。采集任务长时间停留在 `collecting`，没有及时失败；后续重试又先后遇到一次数据库连接中断，以及规范化阶段超过 20 分钟超时。最终在优化规范化逻辑后，Pipeline 于 17:24 完成计算，生成 400 条快照。

计算完成后，发布产物仍未立即让前台更新：同周 Blob 文件不可覆盖、`latest/manifest.json` 写入失败被吞掉，且旧的 `latest` 文件有 30 天 CDN 缓存。修复覆盖写入、失败传播与缓存策略后，于 18:17 幂等重发既有快照；`latest` 和前台品类页均已切换到本周。

没有重新采集已完成的数据；最后的发布恢复不调用 OpenRouter，不产生新的 AI 请求费用。

## 用户影响

- 周一的榜单未按预期自动更新。
- 恢复前，依赖 `leaderboards/latest/manifest.json` 的前台会继续读取 `Week of 2026-07-27`。
- 数据库中本周最终数据完整：120 个成功回答、2,465 个已抽取提及、400 条排行榜快照。
- 未发现已发布周快照被覆盖为错误数据或数据丢失。

## 事实时间线（北京时间）

| 时间 | 事件 | 结果 |
| --- | --- | --- |
| 10:04 | 自动 Pipeline 开始，运行 `cmscl66r9000004jubr5ei0ar` | 停留在 `collecting`。 |
| 16:09 | 可靠性恢复时将该运行标记为失败 | 运行已超过预期采集窗口，未产生可用计数。 |
| 16:27 | 第一次人工重试，运行 `cmscyuqc80000mjkkfxwcifww` | 16:34 因 `Connection terminated unexpectedly` 失败。 |
| 16:34 | 第二次重试，运行 `cmscz48lv0000d9kksx01l5ca` | 采集完成 120 个回答、抽取 2,465 条提及；17:11 在规范化阶段超过 20 分钟超时。 |
| 17:15 | 第三次重试，运行 `cmsd0kpfa0000tbkknr54bj7g` | 17:24 成功完成：规范化 801、快照 400。已完成的回答与提及被复用。 |
| 17:24 后 | 发现本周 immutable manifest 已存在，但 `latest` 仍指向旧周 | 发布端未正确覆盖既有 Blob，且失败被静默处理。 |
| 18:17 | 部署发布修复后，幂等重发本周快照 | `latest`、本周 manifest、前台 AI Tools 页均确认显示 `Week of 2026-08-03`。 |

> 时间来自 `pipeline_runs.started_at` / `finished_at`（UTC 转北京时间）和 Blob manifest 的 `publishedAt`。发布接口的具体调用时间未单独持久化，使用 manifest 时间作为完成时间。

## 根因分析

### 1. 首次采集没有完整的超时边界（主因）

单个 OpenRouter 请求和整个采集阶段原先都缺少可靠的截止时间控制。外部请求未返回时，运行会一直保留 `running / collecting` 状态，直到人工介入；因此首次运行持续约 6 小时而没有自行失败或释放重试机会。

### 2. 规范化实现存在 N+1 数据库操作（主因）

规范化会对大量 mention 逐条查询并写入数据库。本周有 2,465 条提及，逐条读写使该阶段在 20 分钟 watchdog 内无法完成。这个超时是保护机制正确生效，而不是数据本身异常。

### 3. 发布缺少“提交点”语义（主因）

发布本周文件成功并不等于站点已经切换。本周文件写入后：

- 既有路径默认不允许覆盖，重发同一周失败；
- `latest/manifest.json` 的写入异常被捕获后忽略；
- `latest` 使用默认 30 天缓存，属于可变指针却被当成不可变文件缓存。

因此接口可表现为成功或周 manifest 可用，但前台仍是上一周。

### 4. 数据库连接中断（已知现象，根因待补证）

第一次人工重试记录的错误是 `Connection terminated unexpectedly`。现有 `pipeline_runs` 没有连接池、数据库端或请求链路的细粒度日志，无法严谨归因于连接池、网络或服务端重启；本报告不把它定为本次事故的根因。后续需要补充结构化错误上下文后再判断。

## 修复措施与验证

| 项目 | 已实施修复 | 验证结果 |
| --- | --- | --- |
| 外部请求 | 单次 OpenRouter 请求默认 45 秒超时，最多重试 1 次。 | 卡住的请求可失败返回，不再无限等待。 |
| Pipeline 阶段 | 采集、抽取及其他阶段设置 deadline/watchdog；超过 30 小时的 `running` 运行自动标为 stale/failed。 | 超时不会推进发布，也不会永久阻止后续运行。 |
| 采集恢复 | 并发上限设为 4；成功回答跳过，失败回答允许在重试时覆盖。 | 重试可复用已完成工作，避免重复请求。 |
| 规范化 | 预加载已有解析结果，批量写入新增记录，替换逐 mention 的多次数据库读写。 | 最终运行在约 9 分钟内完成整条 Pipeline。 |
| 周快照重发 | 同周 category JSON 与 week manifest 支持受控覆盖。 | 不重新采集即可安全重发已验证周。 |
| `latest` 提交点 | `latest/manifest.json` 支持覆盖、缓存设为 60 秒；写入失败会使发布失败。 | 最新 manifest 已指向 `Week of 2026-08-03`。 |
| 前台读取 | 当环境变量配置为 `latest` 路径时，前台按当前周读取不可变周 manifest。 | `/category/ai-tools` 已显示 `Week of 2026-08-03`。 |

相关提交：`0efd1b9 Improve pipeline reliability and leaderboard publishing`。

## 验收证据

- 成功运行：`cmsd0kpfa0000tbkknr54bj7g`
- 成功计数：120 successful responses、2,465 extracted mentions（前一失败运行已完成，最终续跑复用）、801 resolved mentions、400 snapshots。
- 本周 manifest：`leaderboards/Week of 2026-08-03/manifest.json`
- latest manifest：`leaderboards/latest/manifest.json`，内容周次为 `Week of 2026-08-03`。
- 生产页面：`https://georadar.website/category/ai-tools` 已确认显示本周周次。

## 后续预防动作

### 下次周更前完成

1. 已加入发布 manifest fixture：有效、旧周、缺榜单三种状态可通过 `npm run pipeline:fixtures` 本地验证。阶段超时和外部请求重试仍需在 staging 使用受控 fixture 演练。
2. 已加入 `/api/pipeline`、`/api/publish` 的结构化运行日志：run ID、阶段、耗时、Blob 写入结果与错误类型。
3. 已加入 Cron 后自动健康检查：确认运行成功、`snapshot_count > 0`、immutable week manifest 和 latest manifest 都已验证；生产环境会额外读取公开品类页确认实际渲染的周次；可选 webhook 在配置后发送失败告警。

### 后续迭代

1. 为数据库连接中断记录连接/请求上下文，并评估 Prisma/数据库连接池配置。
2. 将发布状态持久化为可查询的“周文件完成 + latest 已切换”两阶段状态，避免只看 Pipeline `success` 判断站点已更新。
3. 已实现发布后前台冒烟检查，确认 AI Tools 品类页读取的周次正确；首页检查可在首页展示周次后复用同一机制。

## 经验与边界

- “计算完成”与“站点已发布”是两个独立结果，必须分别验收。
- 对外部 API、数据库批处理和 Blob 发布都需要超时、幂等与可观测性；只靠人工观察运行状态不足以保证周更。
- 重发已验证快照属于发布恢复，不应重新执行采集；它不产生新的 OpenRouter 请求费用。
- 本次无法从现有日志精确拆分每次失败重试所产生的 OpenRouter 用量。未来应在每次运行中记录请求数、重试数和 provider request ID，才能做费用级别的归因。
