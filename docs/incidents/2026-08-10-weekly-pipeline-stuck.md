# 2026-08-10 周更卡住（collecting）

**状态：** 本周核心 5 品类已人工续跑恢复；结构性防再发见下方。  
**影响周次：** `Week of 2026-08-10`  
**现象：** Cron 启动后 `pipeline_runs` 长期 `running` / `collecting`（约 26h+），本周 snapshots=0；前台当前周空榜。

## 根因（与 2026-08-03 同类）

1. **`/api/cron` 一次跑完全部 pipeline**，超过 Vercel serverless 执行上限时进程被杀死，**来不及把 run 标成 `failed`**。  
2. 陈旧判定原先看 `started_at`、默认 **30 小时**，卡住期间无法重入。  
3. Blob store blocked 是并行问题；空榜主因是本周未完成计分（DB-first 部署后仍需有 snapshots）。

## 恢复（已做）

- 人工标记卡住 run 失败。  
- 仅核心 5 品类补采（跳过已 ok 的 chatgpt/gemini），再 extract → score；`publish` 默认不写 Blob。  
- 生产 `/category/ai-tools` 恢复显示 `Week of 2026-08-10`。

## 防再发（代码）

- `runPipelineTick`：每次 Cron 只推进一个引擎或一个后处理阶段。  
- Cron `after()` 自链 + `vercel.json` 周一错峰多次触发。  
- `pipeline_runs.updated_at` 心跳；无心跳默认 **90 分钟** 标 stale。  
- `maxDuration = 300`。  
- 本地 `npm run pipeline` 仍为一键全量。

详见 [operations.md](../ops/operations.md)。
