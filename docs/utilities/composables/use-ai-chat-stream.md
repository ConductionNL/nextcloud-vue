# useAiChatStream

Conversation-transport composable for the [AI Chat Companion](../../components/cn-ai-companion.md).
Owns the full SSE lifecycle against OpenRegister's chat endpoints and exposes a
reactive state object plus `send()` / abort controls. Create one instance per
`CnAiCompanion` mount and pass `state` to [`CnAiChatPanel`](../../components/cn-ai-chat-panel.md).

## Signature

```js
import { useAiChatStream } from '@conduction/nextcloud-vue'

// In CnAiCompanion's data()/setup, passing the component instance so the
// outgoing request body carries the current cnAiContext snapshot:
const { state, send, abort } = useAiChatStream(this)
```

| Argument | Type | Description |
|---|---|---|
| `contextInstance` | `object` | Vue component instance to read `cnAiContext` from (via [`useAiContext`](./use-ai-context.md)) — pass the `CnAiCompanion` instance. |

## Transport

- POSTs `/index.php/apps/openregister/api/chat/stream` via `@microsoft/fetch-event-source` and handles the six-event envelope: `token`, `tool_call`, `tool_result`, `heartbeat`, `final`, `error`.
- Falls back to POST `/index.php/apps/openregister/api/chat/send` (axios) when the streaming endpoint returns 404/501 or fails mid-handshake, synthesising a single `final` event so rendering code never branches.

## Return value

A reactive state object — `{ isStreaming, currentText, toolCalls, error, messages }` — plus the methods to drive it (`send`, `abort`, new-thread toggle).

## Reference

- Implementation: [src/composables/useAiChatStream.js](../../../src/composables/useAiChatStream.js)
- Related: [CnAiCompanion](../../components/cn-ai-companion.md), [CnAiChatPanel](../../components/cn-ai-chat-panel.md), [useAiContext](./use-ai-context.md)
