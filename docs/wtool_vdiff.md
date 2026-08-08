---
layout: custom
title: A Monaco Diff Viewer with Patch Support and Multi-File Virtual Scrolling
description: The background, design considerations, and minimal usage examples for wtool-vdiff
target_github_url: https://github.com/defghy/web-toolkits/tree/main/packages/wtool-vdiff
show_downloads: true
github:
  zip_url: https://www.npmjs.com/package/@yuhufe/wtool-vdiff
last_modified_at: 2026-08-08 00:00:00 +0800
---

## Demo

Demo: [https://defghy.github.io/web-toolkits/v-diff/](https://defghy.github.io/web-toolkits/v-diff/)

## Background

There are already diff component libraries such as [rtfpessoa/diff2html](https://github.com/rtfpessoa/diff2html) and [MrWangJustToDo/git-diff-view](https://github.com/MrWangJustToDo/git-diff-view).

> Problem: rendering a diff with too many lines causes lag, and rendering too many diff files does as well.

To address these issues, I built [wtool-vdiff](https://github.com/defghy/web-toolkits/tree/main/packages/wtool-vdiff), a library for rendering diffs across a large number of files.

> Built on Monaco, it supports both `diffPatch` (unified diff) and `diffPair` (the complete files before and after modification) as input. It also supports a file list, file navigation, and three-layer virtual scrolling within a single file.

## Usage

Add a container to the page, then pass in a patch:

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

You can also use `diffPair`. The instance returned by `createDiffViewer` provides `update` and `destroy` methods.

### Multi-File Diffs

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

The `fullPath` field is optional.

The library is wrapped as a Web Component, so it can be integrated into Vue, React, or vanilla JavaScript projects in the same way.

## Related Links

[https://defghy.github.io/web-toolkits/v-diff/](https://defghy.github.io/web-toolkits/v-diff/)

For Monaco loader configuration, local worker loading, the complete props API, and more usage patterns, see the [GitHub README](https://github.com/defghy/web-toolkits/tree/main/packages/wtool-vdiff#readme).
