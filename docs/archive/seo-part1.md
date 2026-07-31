# GEO 项目上线 SEO 检查清单 v1.0（历史参考）

> 当前 SEO 规范和后续任务请以 [seo.md](./seo.md) 为准。本文件保留旧版上线检查和增长建议，后续归档后不再单独维护。

> 适用：新站上线后的技术 SEO 验收与收录启动。  
> 正式域名示例：`https://georadar.website`

当前 GEO Radar 阶段评估：

| 维度 | 分数 | 说明 |
|------|------|------|
| 技术 SEO | 9/10 | robots / sitemap / canonical / Search Console 已打通 |
| 内容 SEO | 3/10 | 页面可索引，但内容深度不足 |
| 外链 SEO | 0/10 | 尚无主动外链分发 |

已完成（截至本清单编写时）：

- [x] robots.txt 修复
- [x] sitemap.xml 修复
- [x] `NEXT_PUBLIC_SITE_URL` 修复
- [x] canonical 修复
- [x] Search Console 验证
- [x] URL Inspection 显示 `URL is available to Google`
- [x] 已 Request Indexing

---

## 第一阶段：域名

### 1. 主域名确定

必须统一为一个正式域名，例如：

```text
https://georadar.website
```

不要同时出现：

```text
https://www.georadar.website
https://georadar.website
https://xxx.vercel.app
```

要求：

- HTTPS 生效
- 自定义域名绑定到生产环境
- SEO 相关输出一律使用正式域名，不使用 `*.vercel.app`

### 2. Canonical

每个页面必须有 canonical。

首页示例：

```html
<link rel="canonical" href="https://georadar.website/" />
```

分类页示例：

```html
<link rel="canonical" href="https://georadar.website/category/ai-tools" />
```

检查方法：

1. 打开 `view-source:`
2. 搜索 `canonical`

---

## 第二阶段：Robots

### robots.txt

访问：

```text
https://georadar.website/robots.txt
```

应看到：

```txt
User-agent: *
Allow: /

Sitemap: https://georadar.website/sitemap.xml
```

不要出现：

```txt
Disallow: /
```

### 常见错误

错误：

```txt
Host: vercel.app
Sitemap: vercel.app/sitemap.xml
```

正确：

```txt
Sitemap: https://georadar.website/sitemap.xml
```

说明：Host / Sitemap 指向 `*.vercel.app` 是新站最常见坑之一，会导致 Search Console `Couldn't fetch`。

---

## 第三阶段：Sitemap

### sitemap.xml

访问：

```text
https://georadar.website/sitemap.xml
```

要求：

- 返回 200
- 合法 XML
- 所有 `<loc>` 都是正式域名

错误示例：

```xml
https://xxx.vercel.app
```

正确示例：

```xml
https://georadar.website
```

### Search Console

提交：

```text
sitemap.xml
```

目标状态：

```text
Success
```

而不是：

```text
Couldn't fetch
```

常见原因：sitemap URL 错误、robots 配置错误、域名不一致。

---

## 第四阶段：Indexing

### URL Inspection

检查首页：

```text
https://georadar.website
```

目标结果：

```text
URL is available to Google
```

然后点击：

```text
Request Indexing
```

### 分类页全部提交

建议逐个 Request Indexing：

```text
/category/ai-tools
/category/saas-software
/category/ai-image-video-tools
/category/developer-tools
/category/marketing-tools
/methodology
```

---

## 第五阶段：Metadata

### 首页 Title

```text
AI Visibility Rankings for Products | GEO Radar
```

### 分类页 Title

示例：

```text
AI Visibility Rankings for AI Tools 2026 | GEO Radar
```

### 禁止使用

```text
Home
Untitled
Index
```

### 每页必须有

```html
<title>...</title>
<meta name="description" content="..." />
```

---

## 第六阶段：内容质量

提交 Sitemap ≠ 自动收录。

Google 只会先：

```text
发现页面
```

不会保证收录。

### GEO Radar 内容最低标准

| 页面 | 最低字数建议 |
|------|--------------|
| 首页 | 1000+ |
| 分类页 | 500+ |
| Methodology | 1500+ |

建议覆盖：

- How we collect data
- How scoring works
- Weekly update process

---

## 第七阶段：内链

首页应链接到：

- AI Tools
- SaaS Software
- AI Image / Video
- Developer Tools
- Marketing Tools
- Methodology

分类页应能返回首页，形成：

```text
首页
  ↓
分类页
  ↓
详情页（后续）
```

---

## 第八阶段：外链

新站收录加速的关键动作。上线第一周建议：

### GitHub

在 README 加入：

```text
https://georadar.website
```

### X (Twitter)

发 Launch 帖：

```text
Launching GEO Radar
```

### Reddit

发主题：

```text
AI Visibility Rankings
```

### Indie Hackers

发：

```text
Show IH
```

---

## 第九阶段：GEO Radar 专属 SEO

### 核心词

```text
AI visibility rankings
AI rankings
AI search rankings
GEO rankings
```

### 长尾词

```text
Best AI tools 2026
Most recommended AI tools by ChatGPT
Top SaaS tools in ChatGPT
AI answer rankings
Generative Engine Optimization
```

这些是后续真正有流量潜力的关键词。

---

## 新站上线最终验收（10 项）

全部打勾才算技术 SEO 完成：

- [ ] 域名绑定
- [ ] HTTPS
- [ ] Canonical
- [ ] robots.txt
- [ ] sitemap.xml
- [ ] Search Console
- [ ] URL Inspection
- [ ] Request Indexing
- [ ] Metadata
- [ ] 内链结构

---

## 下一步优先级（Part 1 之后）

技术 SEO 已基本完成，后续最值得投入：

1. 给每个分类页补 500~1000 字内容
2. 强化 Methodology 页面（目标 1500+ 字）
3. 做第一批外链（GitHub、X、Reddit、Indie Hackers）
4. 等待 Google 1~7 天重新抓取 sitemap

完成后，通常几天到几周内可开始出现：

```text
site:georadar.website
```

---

## 相关文件

| 文件 | 作用 |
|------|------|
| `src/lib/seo.ts` | `SITE_URL` / 品类 SEO 文案 |
| `src/app/sitemap.ts` | sitemap 生成 |
| `src/app/robots.ts` | robots 生成 |
| `src/app/layout.tsx` | `metadataBase` / 默认 metadata |
| `src/app/page.tsx` | 首页 metadata + JSON-LD |
| `src/app/category/[slug]/page.tsx` | 品类页 metadata + JSON-LD |
| `src/app/methodology/page.tsx` | 方法论页 metadata |
