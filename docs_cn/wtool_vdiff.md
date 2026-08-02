---
layout: custom
title: 一个支持 Patch 与多文件虚拟滚动的 Monaco Diff Viewer
description: wtool-vdiff 的设计背景、方案对比与最小使用示例
target_github_url: https://github.com/defghy/web-toolkits/tree/main/packages/wtool-vdiff
show_downloads: true
github:
  zip_url: https://www.npmjs.com/package/@yuhufe/wtool-vdiff
last_modified_at: 2026-08-02 00:00:00 +0800
---

## Demo

demo地址：[https://defghy.github.io/web-toolkits/v-diff/](https://defghy.github.io/web-toolkits/v-diff/)

## 背景

业界已有diff组件库 [rtfpessoa/diff2html](https://github.com/rtfpessoa/diff2html)、[MrWangJustToDo/git-diff-view](https://github.com/MrWangJustToDo/git-diff-view)

> 问题：diff行数过多卡顿。diff文件过多卡顿；

基于这些问题，实现大量文件diff的库：[wtool-vdiff](https://github.com/defghy/web-toolkits/tree/main/packages/wtool-vdiff)

> 基于 Monaco 封装，支持 `diffPatch`（unified diff）和 `diffPair`（修改前后的完整文件）两种输入；单文件支持自适应高度和折叠未变更区域，文件列表支持搜索、选择联动和虚拟滚动。

## 使用

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

也可以使用 `diffPair`。`createDiffViewer` 返回的实例提供 `update` 和 `destroy` 方法。

### 文件列表diff

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

`fullPath` 可以非必填。文件列表实例可通过 `fileOverScan` 调整虚拟滚动的预渲染文件数。

库通过 Web Component 封装，可以用同样的方式接入 Vue、React 或原生 JavaScript 项目。

## 相关链接

[https://defghy.github.io/web-toolkits/v-diff/](https://defghy.github.io/web-toolkits/v-diff/)

Monaco loader 配置、本地 Worker 加载、完整 Props 和更多调用方式，请查看 [GitHub README](https://github.com/defghy/web-toolkits/tree/main/packages/wtool-vdiff#readme)。
