---
sidebar_position: 3
---

# useSubResource

Standalone composable for fetching a sub-resource collection hanging off an OpenRegister object (e.g. `/{register}/{schema}/{id}/tasks`). State is scoped to the calling component — no shared store.

Use this when:
- The sub-resource is app-specific and doesn't warrant a global store plugin.
- The response shape is non-standard (e.g. CalDAV tasks, ICommentsManager notes) and needs a `transform` function.
- The calling component is the only consumer of the data.

For sub-resources that need shared state across components (audit trails, relations, files, …), use the dedicated store plugins instead — see [store plugins](../../store/plugins.md).

## Signature

```js
import { useSubResource } from '@conduction/nextcloud-vue'
import { useObjectStore } from '@conduction/nextcloud-vue'

const store = useObjectStore()

const tasks = useSubResource(store, 'tasks', {
  limit: 20,
  transform: (task) => ({
    id: task.uid || task.id,
    title: task.summary,
    deadline: task.due,
    status: task.status,
  }),
})

await tasks.fetch('case', caseId, { _search: 'open', _page: 1 })
console.log(tasks.data.results)
```

### Parameters

| Arg | Type | Description |
|-----|------|-------------|
| `store` | `object` | An object-store instance. Must expose `objectTypeRegistry` and `_options.baseUrl` (any store created with [`useObjectStore`](../../store/object-store.md) or [`createCrudStore`](../../store/crud-store.md) satisfies this). |
| `endpoint` | `string` | URL path segment appended after the object ID. E.g. `'tasks'` yields `.../{id}/tasks`. |
| `options.limit` | `number` | Default `_limit`. Default `20`. |
| `options.transform` | `(item) => item` | Optional per-item mapping applied to `responseData.results`. |

### Return value

| Key | Type | Description |
|-----|------|-------------|
| `data` | `reactive` | `{ results, total, page, pages, limit, offset }`. |
| `loading` | `Ref<boolean>` | True while a fetch is in flight. |
| `error` | `Ref<object \| null>` | Parsed error (`parseResponseError` shape) or a network-error object. |
| `fetch(type, objectId, params?)` | `Function` | Fetch the sub-resource collection. Returns the (transformed) results array. On HTTP failure the error ref is set and `[]` is returned. |
| `clear()` | `Function` | Reset state to defaults. |

### URL construction

```
${store._options.baseUrl}/${registry.register}/${registry.schema}/${objectId}/${endpoint}?<params>
```

`registry` is `store.objectTypeRegistry[type]`; if the type isn't registered, `fetch` throws synchronously inside its try block.

### Request

- `buildHeaders()` (see [build-headers](../build-headers.md)) supplies CSRF and JSON headers.
- `buildQueryString(params)` (see [build-query-string](../build-query-string.md)) serialises params.
- A `TypeError` from `fetch` is surfaced through `networkError` (see [network-error](../network-error.md)); any other thrown error is wrapped into the same shape as `parseResponseError` output.

## Related

- [Store plugins](../../store/plugins.md) — When you want shared state instead of per-component state.
- [useObjectStore](../../store/object-store.md) — Typical source of the `store` argument.
