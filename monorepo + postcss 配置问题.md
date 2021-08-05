## 背景
### 1.1. rem - html宽度

| 场景               | 宽度（MOBILE_WIDTH）      | 实际宽度 |
|  ----             | ----                     | ---|
| h5 (Android，iOS) | document.documentElement | -   |
| h5 (chrome)       |  body                    | 450 |
| editor            |  #mobileContainer        | 420 |

> pc端问题
> 1. 设置html的font-size对pc端组件的影响
> 2. chrome最小12px问题

### 1.2 px => rem
统一度量衡

```
// .postcssrc.js

module.exports = {
    'postcss-pxtorem': {
        rootValue: 50,
        propList: ['*'],
    },
};
```

- h5
- editor mobile文件夹
- 富文本
- vant

项目采用 monorepo(yarn workspace)方式来管理，当使用[vant](https://vant-contrib.gitee.io/vant/#/zh-CN/advanced-usage#rem-bu-ju-gua-pei)这种库的时候，需要在引用处配置`.postcssrc.js`来处理`rem`和`px`转换。

问题由此产生

## 规定
首先我们需要知晓`postcss`和`monorepo`的基础规则

1. .postcssrc.js只对文件所在目录与下级目录产生效果；
> 反过来说当`webpack`编译某个文件a的时候，会一路从`a`向上找`postcss`配置，找到第一个后就应用。

1. `monorepo`的一项基础优化是将所有项目的依赖`node_modules`合并提升到项目根目录。

## 问题

### 1.0
由于上面的规则产生了一个问题

多个项目引用`vant`的时候，由于vant版本不一致，导致有的在根目录的`node_modules`有的在包当前目录的`node_modules`；
>
- 多个vant很难保证使用一致的版本
- 多个vant很难保证使用一致的`postcssrc`配置

### 2.0
一个自然的解决办法是将`vant`收敛到某个包中，其他包使用的时候从这个包里面引用

```
// puzzle-common

import { Button } from 'vant';

export { Button };

// puzzle-mobile
import { Button } from 'puzzle-common';

```

可惜这样是不行的。
这涉及到`vant`这种ui组件库的另一个功能，`部分引入`；
![部分引入](https://hy911.oss-cn-hangzhou.aliyuncs.com/babelImport/part_import.jpeg)
> 即只引入部分组件，vant官方使用`babel-plugin-import`实现此功能。只需要配置babel.config.js即可实现。

```
// babel.config.js

module.exports = {
  presets: [...],
  plugins: [
    ['import', {
      libraryName: 'vant',
      libraryDirectory: 'es',
      style: true
    }, 'vant']
  ]
}
```
这个plugin的特性
- 将`import`语句转译为多条语句
- 不会处理`export`语句

demo如下
```
// puzzle-common

import { Button } from 'vant';

      ↓ ↓ ↓ ↓ ↓ ↓

var _button = require('vant/es/button');
require('vant/es/button/style/index.js');
```
因此对于我们上面的使用方式产生了如下问题

> 相关命令链接
```
NODE_OPTIONS=--max_old_space_size=4096 BROWSERSLIST_ENV=development npx --node-arg=--inspect-brk vue-cli-service serve --host 0.0.0.0
```
[addDefault, addSideEffect](https://babel.dev/docs/en/babel-helper-module-imports)

### 3.0
```
// puzzle-common

import { Button } from 'vant';

export { Button };

      ↓ ↓ ↓ ↓ ↓ ↓

var _button = require('vant/es/button');
require('vant/es/button/style/index.js');
module.exports.Button = _button;

// puzzle-mobile
var _button = require('puzzle-common').Button;

```

可以看出所有组件已经率先由`puzzle-common`引入，失去了部分引入的特性，随着各个包的开发common中的vant体积会越来越大；

## 解决办法
需要使得`puzzle-common`适配`babel-plugin-import`，使得其支持部分引入。
#### 首先
配置`puzzle-common`的目录结构如下
![目录结构](https://hy911.oss-cn-hangzhou.aliyuncs.com/common_vant.png)

以`Button`为例
```
// index.ts
import { Button } from 'vant';
export default Button;

// style.ts
export * from 'vant/es/button/style/index.js';

```

#### 其次
重新配置`babel-import-plugin`，这次以`puzzle-common`为入口
```
// babel.config.js

  plugins: [
    ['import', {
      libraryName: 'puzzle-common/vant',
      libraryDirectory: '',
      style: true
    }, 'vant']
  ]
```

此时引用转译如下
```
// puzzle-mobile

import { Button } from 'puzzle-common/vant';

      ↓ ↓ ↓ ↓ ↓ ↓

var _button = require('puzzle-common/vant/es/button/index.ts');
require('puzzle-common/vant/es/button/style.js');
```

符合我们的预期，效果正常。

完
