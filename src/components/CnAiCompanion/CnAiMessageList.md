# CnAiMessageList

Renders a list of conversation messages with per-role visual styling and inline tool-call expansion.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `messages` | `Array<{role, content, toolCalls?}>` | `[]` | Full conversation message history |
| `currentText` | `string` | `''` | Partial streaming text from the current token stream (shown as an in-progress assistant bubble) |

## Message shape

```ts
interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  toolCalls?: Array<{
    toolId: string
    arguments: unknown
    result?: unknown
    isError?: boolean
  }>
}
```

## Rendering

| Role | Visual style |
|---|---|
| `user` | Right-aligned bubble with `var(--color-primary-element)` background. Plain text — no markdown. |
| `assistant` | Left-aligned bubble with hover-background. Markdown via `NcRichText`. |
| `system` | Centred subdued text. |

Tool calls are collapsed by default to a one-line summary (`Tool: {toolId}`). Clicking expands to show JSON arguments and result. Tool results with `isError: true` render with a `var(--color-error)` accent border.

The assistant bubble container has `aria-live="polite"` for screen-reader streaming announcements.

## Slots

| Slot | Description |
|---|---|
| `empty` | Shown when `messages` array is empty and `currentText` is empty. Use `NcEmptyContent` here. |

## Usage

```vue
<CnAiMessageList :messages="stream.state.messages" :current-text="stream.state.currentText">
  <template #empty>
    <NcEmptyContent name="AI assistant" />
  </template>
</CnAiMessageList>
```
