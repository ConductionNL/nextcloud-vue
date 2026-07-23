# CnAiAgentPicker

Agent dropdown shown on the AI Chat Companion's "start a new conversation"
screen (the empty-state of [`CnAiChatPanel`](./cn-ai-chat-panel.md)). Purely
presentational — the parent owns the `agents` list, `loading`, and `fetchError`
(the same fetch feeds the panel's default-agent selection); this component only
renders the picker and emits the chosen agent uuid.

## Props

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `agents` | Array | No | `[]` | Raw agent objects from `GET {chatApiBase}/agents` (`{ uuid\|id, name\|title }`). |
| `value` | String | No | `null` | Selected agent uuid (`v-model` style — parent owns the value). |
| `loading` | Boolean | No | `false` | Whether the agent list is still loading. |
| `fetchError` | Boolean | No | `false` | Whether the agent-list fetch failed. |

## Events

| Event | Payload | Notes |
|---|---|---|
| `input` | `String \| null` | Chosen agent uuid (or `null` when cleared) — pairs with `value` for `v-model`. |

## Behaviour

- Degrades gracefully: zero agents disables the select with an explanatory
  placeholder; a fetch error renders a short inline notice instead of the
  select, so the surrounding message input and recent sessions stay usable.

## Reference

- Implementation: [src/components/CnAiCompanion/CnAiAgentPicker.vue](../../src/components/CnAiCompanion/CnAiAgentPicker.vue)
- Parent: [CnAiChatPanel](./cn-ai-chat-panel.md)
