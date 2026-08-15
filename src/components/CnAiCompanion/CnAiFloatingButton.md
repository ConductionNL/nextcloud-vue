# CnAiFloatingButton

Circular fixed-position FAB for the AI Chat Companion.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `'bottom-right'` \| `'bottom-left'` \| `'top-right'` \| `'top-left'` | `'bottom-right'` | Viewport corner to anchor to |
| `visible` | `boolean` | `true` | Whether to display the button. Set to `false` when the panel is open. |

## Events

| Event | Payload | Description |
|---|---|---|
| `click` | — | Emitted on click or keyboard activation (Enter/Space) |

## Accessibility

- `aria-label` set via `t(appName, 'Open AI chat')`.
- Keyboard reachable via Tab; activatable via Enter/Space.
- Focus ring uses `var(--color-primary-element)`.
- Respects `prefers-reduced-motion`: no entrance animation or hover transform when reduced.

## Usage

```vue
<CnAiFloatingButton
  :visible="!isPanelOpen"
  position="bottom-right"
  @click="openPanel" />
```
