# Phase 2 上线前准备

对照 `docs/prd/PRD-phase-2.md`。功能验收清单见 [phase-2-manual-qa.md](./phase-2-manual-qa.md)。

当前数据面（本地 env 已验证）：

- `leaderboards/index.json`：5 个周（至 `Week of 2026-08-03`）
- `brands/index.json`：约 90 个品牌

---

## 0. 代码与构建

- [ ] 将 Phase 2 改动提交到 git（目前大量未提交 / 未推送）
- [ ] `npx tsc --noEmit` 通过
- [ ] `npm run lint` 无 error
- [ ] `npm run build` 通过
- [ ] 合并到 `main` 并推送到触发 Vercel 部署的分支

---

## 1. 生产环境变量（Vercel）

确认 Production 已配置：

| 变量 | 要求 |
|------|------|
| `NEXT_PUBLIC_SITE_URL` | `https://georadar.website`（不要用 `*.vercel.app`） |
| `LEADERBOARD_MANIFEST_URL` | 指向 `leaderboards/latest/manifest.json` 公开 URL |
| `BLOB_READ_WRITE_TOKEN` / `BLOB_STORE_ID` | Pipeline / publish 可写 Blob |
| `CRON_SECRET` / `PIPELINE_SECRET` | Cron 与手动触发鉴权 |
| DB / OpenRouter | 与现网周更一致 |

可选：上线验证期临时设 `LOG_PUBLISHED_LEADERBOARD=1`，确认页面走 Blob 而非 DB 回退。

---

## 2. 发布数据（上线前再跑一次）

确保最新周的 **榜单 + Brand 快照** 都已写入 Blob（`publish.ts` 会调用 `publishBrandPages`）：

```bash
npm run publish -- "Week of 2026-08-03"
```

检查：

- [ ] `leaderboards/Week of 2026-08-03/manifest.json` 可访问
- [ ] `leaderboards/latest/manifest.json` 的 `week` 为本周
- [ ] `leaderboards/index.json` 含本周
- [ ] `brands/index.json` 可访问且品牌数合理
- [ ] `brands/{slug}/{week}.json` 抽查 1–2 个（如 `chatgpt`）可访问

仅发布失败时，不要推进 `latest`；修好后再发。

---

## 3. 部署后生产冒烟（georadar.website）

至少打开：

| URL | 期望 |
|-----|------|
| `/` | CTA → `/rankings`；有两周数据时显示 Movers |
| `/rankings` | 5 品类 + #1 预览 |
| `/category/ai-tools` | Company 列、Δ、周选择器、产品链 Brand |
| `/category/ai-tools?week=2026-07-27` | 历史周数据；`noindex` |
| `/category/ai-tools?week=2099-01-01` | 不可用提示 + 回最新 |
| `/brand/chatgpt` | Score / Mention / Why recommends / CTA；`noindex` |
| `/sitemap.xml` | 有 `/` `/rankings` `/category/*`；**无** `/brand/` |
| `/methodology` | 正常 |

完整勾选见 [phase-2-manual-qa.md](./phase-2-manual-qa.md)（把 localhost 换成生产域名）。

---

## 4. Pipeline / 运维确认

- [ ] 下次周更 Cron 前确认 `/api/pipeline-health` 对本周健康
- [ ] 抽查最近一次 `pipeline_runs`：`status=success`、`snapshot_count>0`、`manifest_url` 有值
- [ ] 告警通道可用：`/api/pipeline-alert-test` 或 Resend 测试邮件
- [ ] 文档：`operations.md` 已知周更 / publish / health 流程；Brand 随 `publish` 一并发布

---

## 5. SEO / 产品边界（上线时保持）

- Brand Page v1、`?week=` 历史页：默认 `noindex`，不进 sitemap
- 最新 Category 页可索引
- `Track Your Brand` 仅为占位 CTA，不接支付
- 公司名纯文本，不链公司页

---

## 6. 已知非阻塞项

- 首页可能出现 theme 相关 hydration warning（DevTools）；不影响主流程，可上线后修
- `/brand/openai` 可能 404：榜上实体常是产品名（如 `chatgpt`），不是公司名
- Phase 2 完成后，按文档规则把「已实现」摘要迁入 `PRD-phase-1.md`，本文件可标为已交付

---

## 建议顺序

```text
1. 提交并推送代码 → Vercel 部署
2. npm run publish（最新周，确认 brands + leaderboards）
3. 生产冒烟（上表 + manual-qa）
4. 确认 pipeline-health / 告警
5. 更新 PRD：已实现 → phase-1
```

全部勾完即可认为 Phase 2 可正式上线。
