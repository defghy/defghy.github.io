---
layout: custom
title: "useCompExp: Data Sharing Within a Vue Component Tree"
description: A data-sharing solution within a component tree based on provide/inject, comparison with Pinia, and implementation details
last_modified_at: 2026-09-26 00:00:00 +0800
---

# useCompExp: Data Sharing Within a Vue Component Tree

`useCompExp` is built on Vue's `provide` / `inject` to share data and methods within a component tree, simplifying `typescript` types and eliminating the need to pass `props` / `emit` down through every level.

## 1. Difference from Pinia

- **Pinia global state**: suitable for sharing data across multiple unrelated component types.
- **useCompExp component-tree data**: scoped only to the descendants of the master component and collected when the component is destroyed. It is suitable for sharing data and methods tightly coupled with the UI, such as a search box and a `keyword` variable.

## 2. Basic Usage

Use `useCompExp` to declare the type.

```ts
export const useActivity = ({ isMaster = false } = {}) =>
  useCompExp<{
    freshList: () => any
    keyword: Ref<string>
  }>({ isMaster, key: 'activity' })
```

**Root component**

```ts
const { registerFunc, funcs } = useActivity({ isMaster: true })

const list = ref([])
const freshList = function() {
  list.value = totalList.filter(item => item.name === funcs.keyword.value)
}
registerFunc({ freshList })
```

**Child component**

```ts
const { funcs, registerFunc } = useActivity()

// Register your own capabilities back to the master
registerFunc({ 
  keyword: ref('')
})

// Click the search button to trigger a list refresh
const onSearch = function () {
  funcs.freshList()
}
```

Note: the master must be an ancestor, otherwise you get an empty object without any error; also, child components should not pass `isMaster: true` by mistake.

## 3. Implementation Principle

The core is only a dozen or so lines:

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

Key points:

- The master creates `funcs` and `provide`s it to the subtree; what `inject` receives is the **same object reference**.
- `registerFunc` uses `Object.assign` to merge **in place**, so the reference never changes and it is accessible before and after registration.
- `funcs` is a plain object, so **reactivity is your responsibility**: register `ref` / `computed`, not raw values.
- Types are only compile-time assertions; fields that are not registered are `undefined` at runtime, so null-value protection is required.

## Conclusion

Treat it as a complement to Pinia: leave global state to Pinia, and hand over capability exchange within a component tree to `useCompExp`.
