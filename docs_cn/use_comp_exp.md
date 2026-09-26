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
    freshList: () => any
    keyword: Ref<string>
  }>({ isMaster, key: 'activity' })
```

**根组件**

```ts
const { registerFunc, funcs } = useActivity({ isMaster: true })

const list = ref([])
const freshList = function() {
  list.value = totalList.filter(item => item.name === funcs.keyword.value)
}
registerFunc({ freshList })
```

**子组件**

```ts
const { funcs, registerFunc } = useActivity()

// 反向注册自己的能力
registerFunc({ 
  keyword: ref('')
})

// 点击搜索按钮，触发列表刷新
const onSearch = function () {
  funcs.freshList()
}
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

## 结语

把它当 Pinia 的补充：全局状态交给 Pinia，组件树内的能力互通交给 `useCompExp`。
