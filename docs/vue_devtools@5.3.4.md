---
layout: default
title: Vue2 Devtools Causing Page Lag, Solution
target_github_url: https://github.com/kxxxlfe/devtools
show_downloads: ["true"]
github:
  zip_url: https://github.com/kxxxlfe/devtools/releases/download/5.4.1/vue-devtools@5.4.1.zip
---

## Background
- Our project was upgraded to `vue@2.7.16`.
- It is challenging to upgrade old `vue@2` projects to `vue@3`.
- `vue.js devtools@5.3.4` is no longer maintained.
- `vue.js devtools@5.3.4` does not support common features like the new `setup state`.
- `vue.js devtools@6.6.3` crashes immediately on `vue@2` projects.
- Due to historical and business reasons, the project has poor page performance, causing `vue.js devtools@5.3.4` to freeze in certain scenarios.
- `Chrome` now requires extensions to upgrade to `manifest@v3`.

Solution: Forked a new [devtools](https://github.com/kxxxlfe/devtools) from [5.3.4](https://github.com/vuejs/devtools/tree/v5.3.4) and adapted it for the complex legacy pages.

## Features

- Support for displaying `setup` data.

![image](https://hy911.oss-cn-hangzhou.aliyuncs.com/tech/setup_state.png)

- Support for `pinia` data.

![image](https://hy911.oss-cn-hangzhou.aliyuncs.com/tech/pinia_store.png)

- Upgraded to `manifest v3`.
- Devtools project upgraded to `webpack@5`.
- Developed with `vue@2.7.16`.
- Support for response-based communication mechanisms.

## Issue: Page Lag on Entry

#### Root Cause

Upon entering the page, thousands of `vuex:mutation` events are generated. Each `vuex` event serializes the store and sends it to `backend.html`.

![image](https://hy911.oss-cn-hangzhou.aliyuncs.com/tech/vuex_mutations.png)

#### Solution
Since we mostly check the latest state in `vuex` and rarely use the time-travel feature, we throttled `vuex:mutation` events as shown:

```javascript
// devtools/packages/app-backend/src/vuex.js

+   const onMutation = debounce((...args) => this.onMutation(...args), 500); // Throttle onMutation as time-travel is not needed
    hook.on('vuex:mutation', onMutation);
```

Side Effect: A large number of `vuex` changes in a short time will record only 1-2 store snapshots.

## Issue: Lag When Clicking Options

### Root Cause

- Clicking an option updates the router query, triggering a replace operation.
- This triggers the `router:changed` event.
- The event serializes the `to` parameter in `afterEach`.
- The `to` data contains a significant amount of page data.
- The router toggle functionality is ineffective.

![image](https://hy911.oss-cn-hangzhou.aliyuncs.com/tech/router_changed.jpeg)

### Solution
The `router` feature is rarely used, and the toggle is usually off. Ensure the toggle works as expected:

```javascript
// packages/app-frontend/src/index.js

  bridge.once('ready', version => {
    store.commit('SHOW_MESSAGE', 'Ready. Detected Vue ' + version + '.')
    bridge.send('events:toggle-recording', store.state.events.enabled)
+   bridge.send('router:toggle-recording', store.state.router.enabled) // Properly initialize router toggle
    ...
```

## Issue: Lag During Frequent Operations

- Mouse movements cause page lag.
- The page contains thousands of components.

### Root Cause
A large number of triggered events cause the `component` module to invoke a massive number of `flush` updates in a short time.

### Solution
Use throttling to reduce the frequency of `flush` updates:

```javascript
// devtools/packages/app-backend/src/hook.js
    hook.on('flush', () => {
      if (hook.currentTab === 'components') {
-        flush()
+        debounceFlush()
      }
    })
```

Side Effect: After interactions, the submodules under `Component` (`data`, `props`, `setup`, etc.) will only update after 300ms.

## Issue: Lag When Selecting Simple Components
Some simple components cause page lag and devtools to crash when selected.

### Root Cause
Component instances from `$refs` are included in `computed`, leading to fetching data from other components' instances.

![image](https://hy911.oss-cn-hangzhou.aliyuncs.com/tech/ref_computed1.jpeg)

A large `computed` property in `levelList` caused devtools to crash.

This was due to the use of `@Ref` syntax in the class, as shown:

> @Ref('level-list') levelList!: LevelList

The implementation of `@Ref` is as follows:

```javascript
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

### Solution
When collecting data in devtools, remove properties in `computed` that have the same name as those in `$refs`:

```javascript
// devtools/packages/app-backend/src/index.js

+ if (def.cache === false && !Reflect.hasOwnProperty(def, 'set')) {
+   if (Object.values(instance.$refs).find(comp => comp === instance[key])) {
+     continue
+   }
+ }
```

## Issue: Devtools Becomes Unresponsive After Some Time

- The `Component` tab in devtools becomes mostly unresponsive after some time.
- Restarting devtools resolves the issue.

### Root Cause

Different environments in the `extension` have varying communication mechanisms. For `vue devtools`, communication primarily involves `backend.js` and `devtool.js`:
- `backend.js`: Executes in the host page (e.g., `https://localhost`).
- `devtool.js`: Executes in the devtools inspector page.

Communication flow:

![image](https://hy911.oss-cn-hangzhou.aliyuncs.com/tech/vue_devtools_message.png)

Connection characteristics:
- Sending a single message involves 4 message transfers.
- A persistent connection exists between `devtool` and `service-worker`.
- Another persistent connection exists between `content-script` and `service-worker`.
- Ports frequently disconnect without error messages for debugging.

### Solution

Due to port disconnections, devtools becomes unresponsive. The solution involves:

- Changing the message path to: web <=> `content-script` <=> `devtools.html` (3 steps).
- Replacing persistent connections with direct `sendMessage` transfers. This effectively switches from a `TCP`-like approach to a `UDP`-like approach.

## Project Repository
https://github.com/kxxxlfe/devtools

End
