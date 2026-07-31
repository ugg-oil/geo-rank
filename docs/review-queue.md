# Review Queue 操作指南

> 本文档只负责审核操作。品牌规范化和整体数据流见 [architecture.md](./architecture.md)，周更编排见 [operations.md](./operations.md)。

每周 pipeline 跑完后，未匹配到的品牌会**自动新建并参与当周计分**，同时写入 `brand_review_queue`（`status=pending`）。

**merge / new / ignore** 的结果从**下周** pipeline 起生效，不会重算当周已发布的快照。

---

## 推荐：自动审核

```bash
npm run review:auto              # 预览，输出 data/review-auto.json
npm run review:auto -- --apply   # 应用高置信度结果
```

中等置信度 merge 可追加：

```bash
npm run review:auto -- --apply --min-confidence medium
```

启用 LLM 辅助（规则覆盖不到的项）：

```bash
npm run review:auto -- --llm --apply --min-confidence medium
```

### 自动化策略

| 类型 | 规则 |
|------|------|
| `ignore` | 泛词黑名单（如 `AI tool`、`platform`） |
| `merge` | 已知别名映射 + 字符串相似度 / 子串匹配 |
| `new` | 其余看起来像独立产品名的品牌 |
| `llm` | 可选，对规则未覆盖项批量分类 |

### 接入周更

```bash
npm run pipeline
npm run review:auto -- --apply
```

---

## 如何查看是否有待确认项

### 查数据库（最直接）

```sql
SELECT status, COUNT(*)
FROM brand_review_queue
WHERE week = 'Week of 2026-07-27'
GROUP BY status;
```

`pending = 0` 表示本周已全部处理。

### 导出文件

```bash
npm run review:export
```

生成 `data/review.json`。有内容 = 有待确认品牌。

### Prisma Studio

```bash
npm run db:studio
```

进入 `brand_review_queue`，筛选 `status = pending`。

---

## 备选：人工审核

当自动审核结果不理想时，可手动编辑：

```bash
npm run review:export
# 编辑 data/review.json，为每条添加 action
npm run review:import
```

### action 含义

| action | 含义 | 必填字段 |
|--------|------|----------|
| `merge` | 合并到已有品牌（作为别名） | `target`（目标规范名） |
| `new` | 保留为独立品牌 | — |
| `ignore` | 非产品/噪音，后续过滤 | — |

示例：

```json
[
  { "raw_brand": "Jasper AI", "action": "merge", "target": "Jasper" },
  { "raw_brand": "Grammarly", "action": "new" },
  { "raw_brand": "best platform", "action": "ignore" }
]
```

---

## status 含义

| status | 含义 |
|--------|------|
| `pending` | 待确认 |
| `merged` | 已合并到已有品牌 |
| `new` | 已确认为独立品牌 |
| `ignored` | 已忽略（非产品/噪音） |

---

## 生效时机

| 时机 | 说明 |
|------|------|
| 当周 | 自动新建的品牌已参与计分，榜单已发布 |
| 下周起 | merge 的别名合并、ignore 的过滤规则生效 |

---

## 关于 `data/` 目录

- `data/review.json`、`data/review-auto.json` 为运行时临时文件
- 已在 `.gitignore` 中忽略，不入库
- 审核结果写入数据库后**可安全删除**整个 `data/` 目录
- 下次 `review:export` 或 `review:auto` 会重新生成

---

## 预期工作量

- 首周：候选多，建议 `review:auto --apply` 一键处理
- 稳定后：每周 pending 通常 < 10 条

---

## 相关命令

| 命令 | 说明 |
|------|------|
| `npm run review:auto` | 预览自动审核决策 |
| `npm run review:auto -- --apply` | 应用高置信度结果 |
| `npm run review:export` | 导出待确认列表 |
| `npm run review:import` | 导入人工标注 |
| `npm run db:studio` | 可视化查看队列 |
