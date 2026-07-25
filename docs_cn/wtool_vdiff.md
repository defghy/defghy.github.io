---
layout: custom
title: 一个支持 Patch 与多文件虚拟滚动的 Monaco Diff Viewer
description: wtool-vdiff 的设计背景、方案对比与最小使用示例
target_github_url: https://github.com/defghy/web-toolkits/tree/main/packages/wtool-vdiff
show_downloads: true
github:
  zip_url: https://www.npmjs.com/package/@yuhufe/wtool-vdiff
last_modified_at: 2026-07-25 00:00:00 +0800
---

## 背景

业界已有成熟的 [rtfpessoa/diff2html](https://github.com/rtfpessoa/diff2html)，可以将 Git Diff 转换为 HTML，并支持单列、双列和文件摘要等展示方式。

> 问题：diff行数过多卡顿。diff文件过多卡顿；

## wtool-vdiff

demo地址：[https://defghy.github.io/web-toolkits/v-diff/](https://defghy.github.io/web-toolkits/v-diff/)

基于这些问题，实现大量文件diff的库：[wtool-vdiff](https://github.com/defghy/web-toolkits/tree/main/packages/wtool-vdiff) 

> 基于 Monaco 封装，单文件 & 文件列表 都支持虚拟滚动；`monaco DiffViewer`本身不支持`patch`，`vdiff`增加了`patch`支持

## 使用

安装：

```bash
pnpm add @yuhufe/wtool-vdiff
```

页面准备一个容器，然后传入 patch：

```html
<div id="diff"></div>
```

```typescript
import { createDiffViewer } from '@yuhufe/wtool-vdiff'

createDiffViewer(document.querySelector('#diff')!, {
  diffPatch: `--- a/src/index.ts
+++ b/src/index.ts
@@ -1,2 +1,2 @@
-const version = 1
+const version = 2
 export { version }`,
})
```

文件列表diff

```html
<div id="diff-files" style="height: 560px"></div>
```

```typescript
import { createDiffFiles } from '@yuhufe/wtool-vdiff'

createDiffFiles(document.querySelector('#diff-files')!, {
  diffFiles: [
    {
      fullPath: 'src/index.ts',
      diffPatch: `--- a/src/index.ts
+++ b/src/index.ts
@@ -1 +1 @@
-export const version = 1
+export const version = 2`,
    },
    {
      fullPath: 'src/sum.ts',
      diffPatch: `--- a/src/sum.ts
+++ b/src/sum.ts
@@ -1 +1 @@
-export const sum = (a, b) => a + b
+export const sum = (a: number, b: number) => a + b`,
    },
  ],
})
```

库通过 Web Component 封装，可以用同样的方式接入 Vue、React 或原生 JavaScript 项目。

## Demo

[https://defghy.github.io/web-toolkits/v-diff/](https://defghy.github.io/web-toolkits/v-diff/)
