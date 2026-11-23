---
sidebar_position: 50
---

# CnFlowViewSwitch

Canvas or List: the two views of one flow (shared part `OrFlowKop`). `CnFlowEditorPage` draws it when `listMode` is on.

```vue
<CnFlowViewSwitch v-model="view" note />
```

## Props

| Prop | Type | Default | What it does |
|---|---|---|---|
| `modelValue` | `String` | `'canvas'` | The view on screen: `canvas` or `list`. |
| `note` | `Boolean` | `false` | Say beside the switch that both views are the same flow. |

## Events

| Event | Payload | When |
|---|---|---|
| `update:modelValue` | `canvas` or `list` | A view was chosen. |
