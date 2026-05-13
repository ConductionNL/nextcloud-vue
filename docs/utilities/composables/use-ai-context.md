# useAiContext

Returns the reactive `cnAiContext` object provided by [`CnAppRoot`](../../components/cn-app-root.md).
The returned object is the **same** reactive reference `CnAppRoot` created (not a
snapshot), so watchers on individual fields fire when page components
(`CnIndexPage` / `CnDetailPage` / `CnDashboardPage`) overwrite fields to give the
[AI Chat Companion](../../components/cn-ai-companion.md) per-page context.

## Signature

```js
import { useAiContext } from '@conduction/nextcloud-vue'

// In a component that injects `cnAiContext`:
const ctx = useAiContext(this) // ctx.appId, ctx.pageKind, ctx.objectUuid, ...
```

| Argument | Type | Description |
|---|---|---|
| `instance` | `object \| null` | Vue component instance to read the injected `cnAiContext` from (typically `this`). When `null`/absent — or when no `CnAppRoot` ancestor exists — a stable module-level default `{ appId: 'unknown', pageKind: 'custom', route: { path: '' } }` is returned so consumers do not crash. |

## Return value

A reactive `CnAiContext` object: `{ appId, pageKind, objectUuid?, registerSlug?, schemaSlug?, route? }`.

## Reference

- Implementation: [src/composables/useAiContext.js](../../../src/composables/useAiContext.js)
- Related: [CnAiCompanion](../../components/cn-ai-companion.md), [useAiChatStream](./use-ai-chat-stream.md), [CnAppRoot](../../components/cn-app-root.md)
