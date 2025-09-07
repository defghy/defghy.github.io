---
layout: custom
title: web bridge which support `Promise`
description: A library that supports `Promise` across different isolation environments
target_github_url: https://github.com/defghy/web-toolkits/tree/main/packages/wtool-chrome-bridge
show_downloads: true
github:
  zip_url: https://www.npmjs.com/package/@yuhufe/browser-bridge?activeTab=readme
---

## Background
Isolated environment communication, such as between `window.top` and `iframe`; communication between environments in `Chrome Extension`; communication between the main thread and `web worker`; and so on. Native communication methods often encounter the following issues:
- Native communication methods do not support `response`, for example:
  - `chrome.runtime.sendMessage`
  - `(window | vscode | vscode.panel.webview |worker).postMessage`
  - `Electron.WebContents.send`
- Direct communication is not possible, forwarding is required:
    - In `Chrome Extension`, communication between `devtool` and the frontend page requires forwarding through a `content script`.

Each time this issue arises, I encapsulate a utility method that supports `Promise`. Since it happens often, I created a unified API library called [bridge](https://github.com/defghy/web-toolkits/tree/main/packages/wtool-chrome-bridge).

## Usage

The usage process is similar to calling a backend API, as shown below:

#### The `on` method to listen for `API`

```typescript
bridge.on(path: string, async function(params: any) {
    const response = { ret: 0, data: 'Hello' }
    return response
});
```

Explanation:
- path: API path, e.g., 'web/getUserInfo'
    - To differentiate between multiple environments, the path must start with the environment key `plat`.
    - Unlike event listeners, one `path` can only correspond to one method.
- params: API parameters
- response: API return value

#### The `request` method to call an API

```typescript
const response = await bridge.request(path, { username: 'yh' });
```

Explanation:
- path: Must be consistent with the `on` path

## Example: `chrome-extension` Communication

### Chrome Extension Environments
- web: frontend page
- [content script](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [popup](https://developer.chrome.com/docs/extensions/develop/ui/add-popup)
- [devtool](https://developer.chrome.com/docs/extensions/how-to/devtools/extend-devtools)
- [service worker](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/basics): previously `background script`

![image](https://hy911.oss-cn-hangzhou.aliyuncs.com/tech/runtime_envs.png)

`devtool` or other environments need to communicate with `web` via forwarding through the `content-script`, as shown in the figure:

![image](https://hy911.oss-cn-hangzhou.aliyuncs.com/tech/vue_devtools_message.png)

### Chrome Extension using bridge

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

### Chrome Extension Bridges Introduction

#### WebBridge
- A single page may define multiple `WebBridge`s
    - Multiple `extensions`
    - `extension` and `iframe` coexist
- To differentiate multiple `WebBridge`s, a custom `plat` field is required

#### ContentBridge
- Used to `proxy` communication between parties
- Works with `WebBridge`, requires defining the `platWeb` field

#### DevtoolBridge
- Different Chrome Extensions’ `devtool`s are isolated from each other, so `plat` does not need to be specified
- The same applies to `popup` and `service-worker`

#### BackgroundBridge
#### PopupBridge


## Example: `iframe` Communication

- top page: the host page
    - Only one
    - Uses `iframeEl.contentWindow.postMessage` to communicate
- iframe page: the embedded page
    - There may be multiple, so a `frameKey` must be specified
    - Uses `window.parent.postMessage` to communicate

```typescript
const Plat = { frame1: 'iframeText', top: 'iframeTop' };
const api = {
  getFrameInfo: `${Plat.frame1}/getInfo`,
  getTopInfo: `${Plat.top}/getTopInfo`
}

// top.js
import { IFrameTopBridge } from '@yuhufe/browser-bridge'
const iframeTopBridge = new IFrameTop({ 
  frameKey: Plat.frame1, 
  frameEl: document.querySelector('iframe') 
})
iframeTopBridge.on(api.getTopInfo, async function({ topname }) {
  console.log(topname);
  return { top: 1 };
});
const userInfo = await iframeTopBridge.request(api.getFrameInfo, { username: '' });

// iframe.js
import { IFrameBridge } from '@yuhufe/browser-bridge'
const iframeBridge = new IFrameBridge({ frameKey })
// handle api
iframeBridge.on(api.getFrameInfo, async function({ username }) {
  return { user: '', age: 0 }
});
// call api
const topInfo = await iframeBridge.request(api.getTopInfo, { topname: '' });
```

## Example: `WebWorker` Communication

```typescript
import { Plat } from '@yuhufe/browser-bridge'
const Plat = { worker1: 'worker1', master: 'master' }
const api = {
  getWorkerInfo: `${Plat.worker1}/getInfo`,
  getMasterInfo: `${Plat.master1}/getInfo`
}

// master.js
import { MasterBridge } from '@yuhufe/browser-bridge'
export const masterBridge = new MasterBridge()
const worker = new Worker(new URL('./worker.ts', import.meta.url), {
  type: 'module',
})
masterBridge.bindWorker({ plat: Plat.worker, worker })
// handle api
masterBridge.on(api.getMasterInfo, async function () {
  return { accessToken: 'aaa' }
})

// worker.js
import { WorkerBridge } from '@yuhufe/browser-bridge'

const workerBridge = new WorkerBridge()
const init = async function () {
  const info: any = await workerBridge.request(api.getMasterInfo, null)
  console.log(info)
}
init()
```

## Custom bridge: Communication between two electron windows

The above only encapsulates common scenarios into `bridge`. You can also use `BaseBridge` to create custom encapsulations, as in the example below.

### Communication parties: Two `electron` windows attached on `global` that need to communicate
- mainWin (`Electron.BrowserWindow`)
- backWin (`Electron.BrowserWindow`)

### Communication method
- Listen for events: use `ipcRenderer.on` in their respective code
    - ipcRenderer comes from `Electron.IpcRenderer`
- Trigger events: `backWin` calls `global.mainWin.webContents.send`

Based on the above communication method, construct the `bridge` as follows:

```typescript
import { BaseBridge, MsgDef } from '@yuhufe/browser-bridge'

const ipcRenderer = remote.ipcRenderer

export const WinPlat = {
  backWin: 'backWin', // background window
  mainWin: 'mainWin', // main window
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
      // Only handle bridge messages
      if (!this.isMyMessage(message)) return

      const { target, type } = message

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

Explanation:
- Start listening for events during initialization
- Use `handleRequest` to process request messages
    - Provide a specific implementation of `sendResponse`, in this case directly forwarding
- Use `handleResponse` to process response messages
- Implement the `sendMessage` method to send messages to other `bridges`

`ElectronBridge` usage code is as follows:

```typescript
// backWin
const backBridge = new ElectronBridge({ plat: WinPlat.backWin })
backBridge.on(WinAPI.cptDynamicUpdateFileInfo, async data => {
    // business logic
    return {}
})

// mainWin
const mainBridge = new ElectronBridge({ plat: WinPlat.mainWin })
const data = await mainBridge.request(WinAPI.cptDynamicUpdateFileInfo, {})
```

## Custom bridge: Communication between `vscode extension` and tab page

The vscode extension opens a new tab page using a `json` file, and the tab page displays the graphical structure of the json.

### Communication parties
- `vscode.extension`: the execution environment of the vscode extension code
- `panel.webview`: the execution environment of the vscode extension’s webview
- `jsonViewer`: the actual json visualization page, page address (http://localhost:9999)

We want to establish a `bridge` between `jsonViewer` and `vscode.extension`, code is as follows:

```typescript
export const EXTENSION_PLAT = {
  vscode: 'vscode',
  jsonViewer: 'jsonViewer',
}

// vscode.extension: send/receive messages via panel.webview
import { WebviewPanel } from 'vscode'
import { BaseBridge } from '@yuhufe/browser-bridge'
export class VSCodePanelBridge extends BaseBridge {
  panel: WebviewPanel

  constructor({ panel }: { panel: WebviewPanel }) {
    super({ plat: EXTENSION_PLAT.vscode })
    this.panel = panel
    this.init()
  }

  init() {
    this.panel.webview.onDidReceiveMessage(message => {
      if (!this.isMyMessage(message)) return

      const { target, type } = message
      if (type === MsgDef.REQUEST) {
        this.handleRequest({ request: message })
      } else {
        this.handleResponse({ response: message })
      }
    })
  }

  async sendMessage(message: any) {
    await this.panel.webview.postMessage(message)
    return
  }
}

// panel.webview: only used for forwarding
window.addEventListener('message', event => {
  if (event.data?.target === 'vscode') {
    vscode.postMessage(event.data)
  }
  if (event.data?.target === 'jsonViewer') {
    iframe.contentWindow.postMessage(event.data, '*')
  }
})

// jsonViewer: inside an iframe, communication with panel.webview is the same as IFrameBridge
import { IFrameBridge } from '@yuhufe/browser-bridge'
export const vscodeWebBridge = new IFrameBridge({ frameKey: EXTENSION_PLAT.jsonViewer });

```

After that, communication between `vscodeWebBridge` and `vscodePanelBridge` works the same way as above.

## Project Address
https://github.com/defghy/web-toolkits/tree/main/packages/wtool-chrome-bridge
