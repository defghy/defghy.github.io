---
layout: custom
title: web端隔离环境通信库
description: 不同隔离环境之间支持`Promise`的库
target_github_url: https://github.com/defghy/web-toolkits/tree/main/packages/wtool-chrome-bridge
show_downloads: true
github:
  zip_url: https://www.npmjs.com/package/@yuhufe/browser-bridge?activeTab=readme
---

## 背景
之前项目多次遇到隔离环境需要通信，比如`window.top`和`iframe`。`Chrome Extension`环境之间通信。主线程与`web worker`通信等。原生的通信方式会遇到以下问题
- 原生通信方式不支持`Promise`，比如 
    - `window.postMessage`;
    - `Electron.WebContents.send`;
- 无法直接通信，需要转发
    - `Chrome Extension`中`devtool`与前台页面通信需要`content script`转发

每次遇到这个问题都会封装一个支持`Promise`的工具方法，遇到的次数多了，封装一个统一api的[bridge](https://github.com/defghy/web-toolkits/tree/main/packages/wtool-chrome-bridge)库。

## 使用

整个使用过程类似调用后端接口

#### `on` 方法监听`API`

```typescript
bridge.on(path: string, async function(params: any) {
    const response = { ret: 0, data: 'Hello' }
    return response
});
```

说明：
- path: 接口路径
    - 为区分多个环境，path需要以环境的key`plat`开头
    - 与事件监听有所不同，一个`path`只能对应一个方法
- params: 接口参数
- response: 接口返回值

#### `request` 方法请求接口

```typescript
const response = await bridge.request(path, { username: 'yh' });
```

说明：
- path: 需要和`on`的path保持一致

## 示例：`chrome-extension` 通信

### Chrome Extension 环境
- web: 前台页面
- [content script](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [popup](https://developer.chrome.com/docs/extensions/develop/ui/add-popup)
- [devtool](https://developer.chrome.com/docs/extensions/how-to/devtools/extend-devtools)
- [service worker](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics)：之前的`background script`

![image](https://hy911.oss-cn-hangzhou.aliyuncs.com/tech/runtime_envs.png)

`devtool`或者其他环境与`web`通信需要经过`content-script`中转，如图

![image](https://hy911.oss-cn-hangzhou.aliyuncs.com/tech/vue_devtools_message.png)

### Chrome Extension 使用 bridge

```typescript
const Plat = {
  web: 'testDevtoolsWeb'
};
const api = {
  getPinia: `${Plat.web}/getPiniaInfo`
}

// content script 
// must be required, if you want to request `web`
import { ContentBridge } from '@yuhufe/browser-bridge'
export const contentBridge = new ContentBridge({ platWeb: Plat.web }) 

// web.js
import { WebBridge } from '@yuhufe/browser-bridge'
export const webBridge = new WebBridge({ plat: Plat.web });
webBridge.on(api.getPinia, async function({ key }) {
  console.log(key); // 'board'
  return Promise.resolve({ a: 1 });
});


// devtool.js
import { DevtoolBridge } from '@yuhufe/browser-bridge'
export const devtoolBridge = new DevtoolBridge()

const piniaInfo = await devtoolBridge.request(api.getPinia, { key: 'board' });
console.log(piniaInfo); // { a: 1 }
```

### Chrome Extension Bridges 介绍

#### WebBridge
- 一个页面可能会定义多个`WebBridge`
    - 多个`extension`
    - `extension`与`iframe`共存
- 为了区分多个`WebBridge`，需要自定义`plat`字段

#### ContentBridge
- 用于`proxy`各方通信
- 和`WebBridge`配套，需要定义`platWeb`字段

#### DevtoolBridge
- 不同Chrome Extension的`devtool`是互相隔离的，不需要指定`plat`
- `popup`，`service-worker`同理


## 示例：`iframe`通信

- top页面：宿主页面
    - 只有1个
    - 使用 `iframeEl.contentWindow.postMessage`通信
- iframe页面：被嵌入的页面
    - 可能有多个
    - 需要指定`frameKey`
    - 使用`window.top.postMessage`通信

```typescript
import { Plat } from '@yuhufe/browser-bridge'
// because we have only 1 top and multi iframe;
const frameKey = 'iframeTest' // multi iframe, so every iframe has a key
const topKey = Plat.iframeTop // 1 top so key is only one
const api = {
  getFrameInfo: `${frameKey}/getInfo`,
  getTopInfo: `${topKey}/getTopInfo`
}

// top.js
import { IFrameTopBridge, Plat } from '@yuhufe/browser-bridge'
const iframeTestTop = new IFrameTop({ 
  frameKey, 
  frameEl: document.querySelector('iframe') 
})
iframeTestTop.on(api.getTopInfo, async function({ topname }) {
  console.log(topname);
  return { top: 1 };
});
const userInfo = await iframeTestTop.request(api.getFrameInfo, { username: '' });

// iframe.js
import { IFrameBridge } from '@yuhufe/browser-bridge'
const iframeTest = new IFrameBridge({ frameKey })
iframeTest.on(api.getFrameInfo, async function({ username }) {
  return { user: '', age: 0 }
});
const topInfo = await iframeTest.request(api.getTopInfo, { topname: '' });
```

## 示例：自定义环境通信

我这里只把我需求遇到的场景进行了`bridge`封装，也可以使用`BaseBridge`进行自定义封装。
如下是一个`electron`中多个窗口通信场景
- `electron`在`global`上挂了2个窗口`mainWin`和`backWin`
    - 类型为`Electron.BrowserWindow`
- 监听事件：在各自的代码中调用`ipcRenderer.on`
    - ipcRenderer来自类型`Electron.IpcRenderer`
- 触发事件：`backWin`中调用`global.mainWin.webContents.send`

基于以上通信方式，构造一个支持`Promise`的`bridge`代码如下

```typescript
import { BaseBridge, MsgDef } from '@yuhufe/browser-bridge'

const ipcRenderer = remote.ipcRenderer

export const WinPlat = {
  backWin: 'backWin', // background页面
  mainWin: 'mainWin', // 主页面
}
export const WinAPI = {
  backToggle: `${WinPlat.backWin}/toggle`,
  cptDynamicUpdateFileInfo: `${WinPlat.backWin}/cpt-dynamicUpdate-fileInfo`,
  ipclog: `${WinPlat.mainWin}/ipclog`,
}

export class ElectronBridge extends BaseBridge {
  constructor({ plat }: any = {}) {
    super({ plat })
    this.init()
  }

  init() {
    ipcRenderer?.on('kxBridgeMessage', (evt, message) => {
      // 只处理 bridge 的消息
      if (!this.isBridgeMessage(message)) return

      const { target, type } = message

      // 只处理发给我的页面消息
      if (target !== this.plat) return

      if (type === MsgDef.REQUEST) {
        this.handleRequest({
          request: message,
          sendResponse: response => {
            this.sendMessage(response)
          },
        })
      } else {
        this.handleResponse({ response: message })
      }
    })
  }

  async sendMessage(message) {
    const { target } = message
    return global[target]?.webContents.send('kxBridgeMessage', message)
  }
}
```

说明：
- 在初始化时开始监听事件
- 使用`handleRequest`处理请求消息
    - 提供`sendResponse`具体实现，本例中直接转发
- 使用`handleResponse`处理`response`消息
- 实现`sendMessage`方法，内容为向其他`bridge`发送消息


`ElectronBridge`使用代码如下

```typescript
// backWin
const backBridge = new ElectronBridge({ plat: WinPlat.backWin })
backBridge.on(WinAPI.cptDynamicUpdateFileInfo, async data => {
    // 业务逻辑
    return {}
})

// mainWin
const mainBridge = new ElectronBridge({ plat: WinPlat.mainWin })
const data = await mainBridge.request(WinAPI.cptDynamicUpdateFileInfo, {})
```

## 项目地址
https://github.com/defghy/web-toolkits/tree/main/packages/wtool-chrome-bridge

完