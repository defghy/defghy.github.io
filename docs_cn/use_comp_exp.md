# useCompExp：Vue组件树内的数据共享

`useCompExp` 基于 Vue 的 `provide` / `inject`，在组件树内共享数据方法，简化`typescript`类型，无需层层透传 `props` / `emit`。

## 一、和 Pinia 的区别

- **Pinia 全局变量**：适合多个不同类型组件共享数据。
- **useCompExp 组件树内数据**：作用域仅限 master 组件的后代，随组件销毁而回收。适合与ui紧密相关的数据方法分享，比如搜索框与`keyword`变量

## 二、基础用法

使用`useCompExp`规定类型

```ts
export const useActivity = ({ isMaster = false } = {}) =>
  useCompExp<{
    detail: Ref<any>
    updateDetail: (data: any) => void
    keyword: Ref<string>
  }>({ isMaster, key: 'activity' })
```

**根组件**

```ts
const { registerFunc, funcs } = useActivity({ isMaster: true })

registerFunc({
  detail: toRef(state, 'detail'), // 注册为 Ref 才有响应式
  updateDetail(data) {
    state.detail = data
  },
})

onMounted(() => {
  console.log(funcs.keyword.value)
})
```

**子组件**

```ts
const { funcs, registerFunc } = useActivity()

console.log(funcs.detail?.value) // 使用
funcs.updateDetail({ id: 1 })
// 反向注册自己的能力
registerFunc({ 
  keyword: ref('')
})
```

注意：master 必须是祖先，否则拿到空对象且不报错；子组件别误传 `isMaster: true`

## 三、实现原理

核心只有十几行：

```ts
export const useCompExp = function <T>({ isMaster = true, key = 'compExp' } = {} as any) {
  if (isMaster) {
    const funcs = {} as T
    const registerFunc = funcList => Object.assign(funcs, funcList)
    provide(key, { funcs, registerFunc })
    return { funcs, registerFunc }
  }
  const { funcs, registerFunc } = inject(key, { funcs: {}, registerFunc: () => {} })
  return { funcs, registerFunc } as { funcs: T; registerFunc: (f: Partial<T>) => any }
}
```

要点：

- master 创建 `funcs` 并 `provide` 给子树；`inject` 到的是**同一个对象引用**。
- `registerFunc` 用 `Object.assign` **原地合并**，引用始终不变，注册前后都能访问。
- `funcs` 是普通对象，**响应式要自己负责**：注册 `ref` / `computed`，别注册裸值。
- 类型只是编译期断言，未注册字段运行时是 `undefined`，需要空值保护。

## 四、实战案例

**属性共享**：棋盘组件把棋盘数据注册给子树。

```ts
registerFunc({
  paths: computed(() => board.value.paths),
  r: computed(() => getBoardInfo('r')),
  c: computed(() => getBoardInfo('c')),
})
// 后代：const { r, c } = useBoardData().funcs
```

**方法共享**：根组件只建上下文，实际实现由更深的布局组件注册。

```ts
// 根
useGlobalActions({ isRoot: true })

// 深层布局
const { registerFunc } = useGlobalActions()
registerFunc({ collapseNav: v => { collapsed.value = !v } })

// 任意后代
useGlobalActions().funcs.collapseNav(true)
```

这正是它相对 `props` / `emit` 的价值：**注册点和使用点解耦，且都无需关心彼此位置**。

## 五、优劣

| 优点 | 缺点 |
| --- | --- |
| 零样板，实现极简 | 非响应式容器，需注册 Ref |
| 每个实例自动隔离 | 类型运行时失守，需判空 |
| 可共享任意值（方法/实例） | 仅后代可访问 |
| 随组件销毁自动回收 | 无 DevTools / 持久化 |
| 注册与使用解耦 | 依赖隐式，调试偏难 |

## 结语

把它当 Pinia 的补充：全局状态交给 Pinia，组件树内的能力互通交给 `useCompExp`。
记住两条——**响应式自己负责，类型需空值保护**——就能用得很顺。
