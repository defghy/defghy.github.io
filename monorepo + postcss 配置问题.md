## 背景
h5页面有时候需要给可交互元素添加触摸反馈功能：
- 点击的时候给触摸元素1个样式的修改
- 取消点击的时候还原

本文首先对多种已知方法进行描述，同时总结其优缺点，最后基于以上方法提出我们自己的方法

## 法1：`:active`
使用css的`active`伪选择器，代码如下
```css
button {
    transition: background-color .2s;
    &:active {
        background-color: #f0f;
    }
}
```
优点
- 简单直接，代码量小且纯css原生实现

缺点
- 代码重复，页面的可交互元素一般是非常多的，每个元素都实现一遍上述代码会造成重复

> 缺点: 无法复用

## 法2：`-webkit-tap-highlight-color`
缺点
- 非标准属性
- 平台有限制：只适用于ios
- 适用元素有限制：a标签

基本不可用

## 法3：vue指令 + touch事件监听 实现

借助vue的directive来实现自定义指令

```
    const touchFeedback: DirectiveOptions = {
        bind(el) {
            el.addEventListener('touchstart', touchStartHandle, {
                passive: true,
            });
            el.addEventListener('touchmove', touchMoveHandle, {
                passive: true,
            });
            el.addEventListener('touchend', touchCancelHandle);
            el.addEventListener('touchcancel', touchCancelHandle);
        },
    };
```

具体实现基本是在el点击时设置其特殊样式(`background-color`)，取消点击时还原；
使用时大概是这样

```html
<div v-touch-feedback="#ababab">点击我</div>
```

这个方案是现阶段比较常见的实现方式

优点
- 兼容性强
- 代码一定程度复用

缺点
- 需要传递当前组件的active背景色作为参数
- 每一个dom都要绑定多个touch事件，比较繁重

移动端页面内经常会有大量的可点击元素，每一个都需要我们具体设定下背景色还是有重复的工作量在里面的。

基于已上方法的缺陷，提出一个更加简洁并且使用更方便的触摸反馈实现方案。

## 最终方案：`css变量` + `HSL`
这种实现方案需要借助几项原生功能

- [css变量](https://developer.mozilla.org/zh-CN/docs/Web/CSS/--*)
- [HSL颜色模式](https://developer.mozilla.org/zh-CN/docs/Web/CSS/color_value#hsl%E9%A2%9C%E8%89%B2)

这几种技术已经被绝大多数浏览器支持，基本可以放心使用；


#### 自动计算`active`颜色
针对上一方案问题1，我们常见操作是从取色板取一个与当前颜色一致但是亮度稍暗的一个颜色作为背景色；
![](https://hy911.oss-cn-hangzhou.aliyuncs.com/tapFeedback/color_pick.png
)

那么一个自然的想法是否可以自动计算一个颜色的更暗的色值呢？答案是可以的，这就是`HSL`;

不同于`rgb`这种混合颜色模型，`hsl`是(色相, 饱和度, 亮度)模式，可以通过修改`亮度`维度值来获得我们需要的颜色

计算active颜色代码如下

```typescript
const activeColor = async function(el: HTMLElement) {
    // 获取当前背景色
    const rgba = window.getComputedStyle(el).backgroundColor;
    const [r, g, b, a = 1] = /^rgba?\(([^()]+)\)$/.exec(rgba)?.[1];

    // rgb => hsl
    const [h, s, l] = rgb2hsl(r, g, b);
    const sPer = (s * 100).toFixed(1);

    // 计算低亮度颜色
    const lPer = (l * 0.5 * 100).toFixed(1);

    return `hsla(${h}, ${sPer}%, ${lPer}%, ${a})`;
};
```

其中
- `rgb2hsl`是将rgb转换为hsl，代码网上有很多不再赘述
- 最后返回的颜色，将亮度`l`除以2，即取一半的亮度

#### 响应用户点击行为
这里依然使用`:active`伪选择器方式来实现，但是需要使用`js`来调整`:active`中的颜色。

但是`:active`无法设置在`style`属性中，因此传统的js控制style的方式无法实现，我们需要使用`css变量`来达到目的；

1. 首先设置css
```less
.g-touch-feedback {
    // disabled属性，disabled类 不响应反馈
    &:not(.disabled):not([disabled]) {
        &:active {
            background-color: var(--feedback-active) !important;
        }
    }
}
```
以上css包含了几个特性
- 所有带有`g-touch-feedback`类名的元素，为可反馈的
- 当元素带有`disabled`属性，或者有`disabled`类名时；我们认为元素禁用，此时不可反馈
- `active`时的背景颜色，使用`--feedback-active`变量

2. 然后`js`需要和`css`配合起来，下面是指令代码

```typescript
const touchFeedback: DirectiveOptions = {
    bind(el, binding) {
        el.classList.add('g-touch-feedback');
        el.style.transition = 'background-color .2s';

        const activeColor = calcBackColor(el);
        el.style.setProperty('--feedback-active', activeColor);
    },
    componentUpdated(el) {
        // class 更新后可能会被移除
        el.classList.add('g-touch-feedback');
    },
};
```

3. 使用

```html
<div v-touch-feedback>点击我</div>
```

完
