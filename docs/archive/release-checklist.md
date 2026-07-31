## Blob 快照榜单 上线检查清单

适用：品类页榜单从数据库读取改为读取 Vercel Blob 发布快照（pipeline 预计算）。

---

### 0. 前置条件

1. 项目已完成并能在本地 `npm run build` 通过（类型/ESLint 已通过）
2. Vercel 已配置好 Blob 写入权限（`BLOB_READ_WRITE_TOKEN` 可用）

---

### 1. 必配环境变量（Vercel）

1. `BLOB_READ_WRITE_TOKEN`
2. `LEADERBOARD_MANIFEST_URL`
   - 填入 `npm run publish` 命令输出的 `latestManifest` 的公开 URL
3. （可选）`LOG_PUBLISHED_LEADERBOARD=1`
   - 仅用于上线验证，打开后服务端日志会打印走 Blob 还是回退数据库

---

### 2. 首次手动发布（本地验证发布链路）

1. 执行（可选指定周次）：
   - `npm run publish`
   - 或：`npm run publish -- "Week of YYYY-MM-DD"`
2. 记录命令输出里的 `latestManifest: <url>`
3. 将该 `latestManifest` URL 回填到 Vercel 的 `LEADERBOARD_MANIFEST_URL`

---

### 3. 三个关键检查点（必须做）

#### 检查 0：Pipeline 运行记录

每次 Cron 或手动 pipeline 都会在 `pipeline_runs` 写入记录。上线后每周确认最新记录：

```sql
SELECT week, status, current_step, started_at, finished_at,
       snapshot_count, manifest_url, error_message
FROM pipeline_runs
ORDER BY started_at DESC
LIMIT 3;
```

成功标准：目标周次为本周、`status = success`、`finished_at` 不为空、`snapshot_count > 0`，生产环境同时应有 `manifest_url`。

如果 `status = failed`，先查看 `error_message` 和 `current_step`，不要直接重复运行而不记录原因。

#### 检查 A：页面确实读取到 Blob（而不是回退数据库）

1. 打开任意品类页，例如：
   - `/category/ai-tools`
2. 查看 Vercel 服务端日志：
   - 期望看到：`[PublishedLeaderboard] using published data for slug=...`
   - 若看到：`[PublishedLeaderboard] using fallback`，说明 Blob 读取失败，需要检查：
     - `LEADERBOARD_MANIFEST_URL` 是否正确
     - manifest/board 对应 URL 是否可公开访问

（完成后建议关闭 `LOG_PUBLISHED_LEADERBOARD`，避免日志噪音）

#### 检查 B：manifest 元信息与错周防护

1. manifest 会包含：`version / week / publishedAt`
2. 读取端会校验 manifest 的 `week` 是否与当前 `getCurrentWeek()` 一致
3. 如果 manifest week 不一致，会回退（避免显示错周数据）

#### 检查 C：`latest` manifest 发布失败不影响本周可用

1. pipeline 发布流程中 `latest` 写入被 `try/catch` 包裹
2. `leaderboards/{week}/manifest.json` 若成功发布，本周页面仍可正常读取

---

### 4. 验收：前台体验

1. 首屏加载：
   - 页面展示 `data.week · Top 20`
2. Tab 切换（Overall / ChatGPT / Gemini / Grok）：
   - 预期 Tab 切换为客户端纯切换，不触发重新查库
   - 浏览器 DevTools 的 Network 中应观察不到新的榜单数据请求链路（或至少不再依赖 Postgres）

---

### 5. 回退策略

1. 如果 Blob 配置错误导致回退数据库：
   - 立即检查并修复 `LEADERBOARD_MANIFEST_URL`
   - 必要时临时清空 `LEADERBOARD_MANIFEST_URL` 以验证回退路径
2. 如果 pipeline 发布失败：
   - 先修复 `BLOB_READ_WRITE_TOKEN` 和发布脚本执行错误
   - 保证至少 `leaderboards/{week}/manifest.json` 成功发布
