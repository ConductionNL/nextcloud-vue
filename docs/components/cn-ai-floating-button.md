# CnAiFloatingButton

Fixed-position floating action button that opens the AI Chat Companion panel.
Rendered by [`CnAiCompanion`](./cn-ai-companion.md).

## Props

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `position` | String | No | `'bottom-right'` | Viewport corner at which to anchor the button. |
| `visible` | Boolean | No | `true` | Controls button visibility. Set to `false` while the chat panel is open so the FAB does not visually compete. |

## Events

| Event | Payload | Description |
|---|---|---|
| `click` | — | Emitted when the button is activated; `CnAiCompanion` toggles the panel open. |

## Reference

- Implementation: [src/components/CnAiFloatingButton/CnAiFloatingButton.vue](../../src/components/CnAiFloatingButton/CnAiFloatingButton.vue)
- Parent: [CnAiCompanion](./cn-ai-companion.md)
