# 仓库导览

## 项目概述

本仓库是 `defghy.github.io` 的 GitHub Pages 源码，使用 Jekyll 和 `jekyll-theme-cayman` 生成静态站点。仓库没有应用级构建脚本或 `package.json`；提交到 GitHub 后由 GitHub Pages 完成站点构建。

## 目录结构

- `docs/`：英文技术文档。与中文文档对应时沿用相同文件名，例如 `docs/bridge.md` 对应 `docs_cn/bridge.md`。
- `docs_cn/`：中文技术文档。文章通常使用 `layout: custom` 的 Front Matter；子目录可同时存放文章及其本地图片。
- `defghy/`：个人记录、工作周报和游戏记录。`_config.yml` 将该目录排除在 sitemap 之外。

## 关键文件

- `index.md`：站点首页和文档入口列表。新增公开文章时应同步添加链接。
- `_config.yml`：Jekyll 主题、站点 URL、sitemap 插件和目录级默认配置。
- `_layouts/custom.html`：技术文档使用的自定义页面模板。
- `README.md`：线上首页及 Google、Bing 站长工具入口。

## 文档约定

- 中文文章放在 `docs_cn/`，英文文章放在 `docs/`，对应译文使用相同的相对路径和文件名。
- 技术文档的 Front Matter 至少包含 `layout`、`title` 和 `description`；需要时可增加 `target_github_url`、`show_downloads`、`github.zip_url` 和 `last_modified_at`。
- 文档链接使用 GitHub Pages 的无扩展名路径，例如 `/docs/wtool_vdiff`。
