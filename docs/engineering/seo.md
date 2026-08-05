# SEO

## 当前技术 SEO

- `robots.txt` 由 Next.js 路由生成。
- `sitemap.xml` 由 Next.js sitemap 路由生成。
- 页面通过统一 metadata 和 canonical 配置搜索引擎信息。
- 分类页和品牌榜单使用稳定、可抓取的 URL。
- 部署后应确认生产域名、sitemap 和 canonical 使用正式地址。

## 上线验收

1. 打开正式域名的 `robots.txt` 和 `sitemap.xml`。
2. 确认首页、分类页和方法论页可以正常访问。
3. 检查页面 title、description、canonical 和 Open Graph 信息。
4. 在 Google Search Console 提交 sitemap，并用 URL Inspection 检查关键页面。
5. 确认没有把后台 API、错误页或不应收录的运行时路径加入 sitemap。

## SEO Backlog

- [ ] 持续检查 Google Search Console 的索引覆盖率和抓取错误。
- [ ] 根据搜索表现优化页面标题、描述和内部链接。
- [ ] 增加 GEO 方法论、行业分析和品牌对比内容。
- [ ] 为主要品类补充更有独立价值的介绍内容。
- [ ] 建立 GitHub、X、Reddit、Indie Hackers 等相关外链。
- [ ] 定期记录核心搜索词、收录页面和自然流量变化。
