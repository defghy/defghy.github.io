---
layout: custom
title: vitest内存泄露追踪
description: 批量执行大量`test case`，内存不断上涨导致了内存泄露
---

## 背景
项目使用`vite5`与`vitest`；自动化测试脚本产生了内存泄露。
使用命令`vitest run --logHeapUsage=true`打印结果如下

```
 ✓ tests/ubf.vite.test.ts (4194) 205184ms 6409 MB heap used
   ✓ compareLoongUbf (4194) 205173ms 6409 MB heap used
     ✓ 关卡 2 ubf数据比对 106 MB heap used
     ✓ 关卡 4 ubf数据比对 396ms 111 MB heap used
     ✓ 关卡 5 ubf数据比对 305ms 117 MB heap used
     ✓ 关卡 6 ubf数据比对 110 MB heap used
     ...
     ✓ 关卡 524 ubf数据比对 409ms 368 MB heap used
     ✓ 关卡 526 ubf数据比对 510ms 377 MB heap used
     ✓ 关卡 529 ubf数据比对 544ms 390 MB heap used
     ✓ 关卡 530 ubf数据比对 554ms 386 MB heap used
     ✓ 关卡 531 ubf数据比对 604ms 387 MB heap used
     ✓ 关卡 532 ubf数据比对 541ms 392 MB heap used
     ...
     ✓ 关卡 5570 ubf数据比对 717ms 3787 MB heap used
     ✓ 关卡 5571 ubf数据比对 1196ms 3833 MB heap used
     ✓ 关卡 5573 ubf数据比对 1202ms 3829 MB heap used
     ✓ 关卡 5574 ubf数据比对 1050ms 3828 MB heap used
     ...
     ✓ 关卡 11735 ubf数据比对 1067ms 6388 MB heap used
     ✓ 关卡 11739 ubf数据比对 1182ms 6399 MB heap used
     ✓ 关卡 11740 ubf数据比对 1325ms 6409 MB heap used
     ✓ 关卡 11742 ubf数据比对 1059ms 6403 MB heap used
     ✓ 关卡 11744 ubf数据比对 1069ms 6406 MB heap used
     ✓ 关卡 11745 ubf数据比对 1050ms 6408 MB heap used
```
可以看到随着测试用例执行内存在不断累积。

## global内存泄露

> 分析：每一个test用例都是执行在独立的worker中，因此可能产生泄露的地方一定是全局变量`global`或者其他全局场景。

对代码进行分析，以及遍历了`window`和`globalThis`相关代码，未能找到泄漏点。

## node追踪内存泄露

node对于内存泄露有不少有用方法，列举如下

```
// 获取内存使用状况
process.memoryUsage()
v8.getHeapStatistics()

// 获取内存快照
v8.getHeapSnapshot()
v8.writeHeapSnapshot();
```

api使用起来不太方便，没有使用此方法

## node借助chrome devtools追踪内存泄露

ui方式使用上面的api，对于node可以使用`--inspect-brk`命令。
vitest可以使用如下命令

```bash
vitest --inspect-brk --no-file-parallelism run
```

注意`--no-file-parallelism`必须，chrome devtools单线程更利于调试（否则多线程需要打开好多个调试窗口）；

在内存飚高时中断，比如在id号300时中断。

![image](/docs_cn/vitest_memory_leak/devtools_memory.jpg)

接着使用`Memory`标签生成内存快照，追踪到具体对象

![image](/docs_cn/vitest_memory_leak/memory_snapshot.jpg)

## 解决

通过对异常对象的分析，发现是`pinia`的store产生了累积
解决思路：每次执行test，对`pinia`重新初始化。代码如下

```
  // 修改前
  beforeAll(async () => {
    setActivePinia(createPinia())
    initStore()
  })
  
  // 修改为
  beforeEach(async () => {
    setActivePinia(createPinia())
    initStore()
  })
```

完



