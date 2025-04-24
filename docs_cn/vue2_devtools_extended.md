---
layout: custom
title: Vue2 Devtools 卡顿解决方案
description: Vue2 Devtools 导致卡顿，解决方案
target_github_url: https://github.com/kxxxlfe/devtools
show_downloads: true
github:
  zip_url: https://github.com/kxxxlfe/devtools/releases
last_modified_at:   2024-12-22 11:37:00 +0000
---

## 背景
- 项目升级为`vue@2.7.16`
- `vue@2`老项目很难升级为`vue@3`
- `vue.js devtools@5.3.4`不再维护
- `vue.js devtools@5.3.4`不支持新的`setup state`等常用功能
- `vue.js devtools@6.6.3`对`vue@2`一进入页面卡死
- 项目由于历史以及业务原因页面性能很差，导致`vue.js devtools@5.3.4`会在一些场景卡死
- `chrome`强制要求`extension`升级为`manifest@v3`

解决方法：从[5.3.4](https://github.com/vuejs/devtools/tree/v5.3.4)fork一个新的[devtools](https://github.com/kxxxlfe/devtools)，针对巨石复杂历史页面进行适配

## 功能

- 支持`setup`数据展示

![image](https://hy911.oss-cn-hangzhou.aliyuncs.com/tech/setup_state.png)

- 支持`pinia`数据

![image](https://hy911.oss-cn-hangzhou.aliyuncs.com/tech/pinia_store.png)

- 升级为`manifest v3`
- devtools项目升级为`webpack@5`
- 使用`vue@2.7.16`进行开发
- 支持response的通信机制

## 问题：进入页面卡顿

#### 定位原因

进入页面后产生了数千个`vuex:mutation`事件，每一个vuex事件都会将store进行序列化并传递给backend.html

![image](https://hy911.oss-cn-hangzhou.aliyuncs.com/tech/vuex_mutations.png)

#### 解决
由于vuex我们基本只会查看最新状态，不太会使用其时间旅行功能，因此对`vuex:mutation`进行截流处理如下

```javascript
// devtools/packages/app-backend/src/vuex.js

+   const onMutation = debounce((...args) => this.onMutation(...args), 500) // onMutation比较耗时，不需要时间旅行，截流
    hook.on('vuex:mutation', onMutation)
```

副作用：短时间内大量的vuex改动，只会记录其中的1-2次store快照

## 问题：点击一些选项页面卡顿

### 定位原因

- 点击选项导致router修改了query，发生了replace。
- 触发了`router:changed`事件
- 事件会对`afterEach`中的`to`进行完整序列化
- `to`数据中包含了大量的页面数据
- 以上逻辑，`router`功能开关不生效

![image](https://hy911.oss-cn-hangzhou.aliyuncs.com/tech/router_changed.jpeg)

### 解决
`router`这个功能很少用到，平常开关是关的，使这个开关生效

```
// packages/app-frontend/src/index.js

  bridge.once('ready', version => {
    store.commit('SHOW_MESSAGE', 'Ready. Detected Vue ' + version + '.')
    bridge.send('events:toggle-recording', store.state.events.enabled)
+   bridge.send('router:toggle-recording', store.state.router.enabled) // 初始化时需要正确初始化router开关
    ...
```

## 问题：频繁操作卡顿

- 鼠标来回滑动时，页面卡顿
- 页面中组件成千上万个

### 定位原因
大量事件触发导致`component`模块儿短时间触发了大量`flush`更新

### 解决

使用截流减少`flush`次数

```javascript
// kxxxlfe-libs/devtools/packages/app-backend/src/hook.js
    hook.on('flush', () => {
      if (hook.currentTab === 'components') {
-        flush()
+        debounceFlush()
      }
    })
```

副作用：交互后，300ms后`Component`下`data`；`props`；`setup`;等子模块展示才会发生变化

## 问题：选中简单组件卡顿
一些很简单的组件选中后页面卡顿，devtools卡死。

### 定位原因
`$refs`中的组件实例跑到了`computed`中；导致获取了其他组件的实例数据

![image](https://hy911.oss-cn-hangzhou.aliyuncs.com/tech/ref_computed1.jpeg)

由于levelList里面有一个巨大的computed，导致devtools卡死

因为`class`中使用了`@Ref`语法，如下

> @Ref('level-list') levelList!: LevelList

`@Ref`实现如下
```
/**
 * decorator of a ref prop
 * @param refKey the ref key defined in template
 */
export function Ref(refKey) {
    return createDecorator(function (options, key) {
        options.computed = options.computed || {};
        options.computed[key] = {
            cache: false,
            get: function () {
                return this.$refs[refKey || key];
            },
        };
    });
}
```

### 解决

devtools收集数据时，移除`computed`中与`$refs`同名的属性

```javascript
// kxxxlfe-libs/devtools/packages/app-backend/src/index.js

+ if (def.cache === false && !Reflect.hasOwnProperty(def, 'set')) {
+   if (Object.values(instance.$refs).find(comp => comp === instance[key])) {
+     continue
+   }
+ }
```

## 问题：一段时间后devtools点击没反应

- 一段时间后devtools的Component标签大概率失效
- 关闭devtools重新打开可以解决

### 定位原因

由于`extension`有多个环境，各个环境之间通信机制有所不同，针对`vue devtools`其通信主要围绕`backend.js`和`devtool.js`。
- backend.js: 宿主页面（即前台https://localhost页面）执行
- devtool.js: devtool下inspector页面执行

通信过程如下图
![image](https://hy911.oss-cn-hangzhou.aliyuncs.com/tech/vue_devtools_message.png)

连接方式特性如下
- 发送1次消息需要经过4次消息转发
- `devtool`和`service-worker`建立了1个长连接
- `content-script`和`service-worker`建立了1个长连接
- 建立的port使用中经常断开，且没有任何报错信息以供参考

### 解法

由于port断开，导致了开发工具点击没有效果。针对以上问题，提出以下解法

- 发送消息路径改为：web <=> `content-script` <=> `devtools.html` 3步
- 不再使用长连接，改为每次转发消息直接`sendMessage`。这里实际上是`tcp`思路改为了`udp`思路

## 项目地址
https://github.com/kxxxlfe/devtools/releases

完