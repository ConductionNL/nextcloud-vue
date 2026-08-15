# CnNcWidgetGridPicker

Renders the Nextcloud-discovered widget catalog as a responsive CSS-grid of icon cards. Each card carries the widget's icon, a single-line ellipsised title, and shows a selected-state border + check overlay when active.

Selection is exposed as the widget id (string) — the same shape a `<select>` would use, so the parent form's `update:content` payload is unchanged.

:::warning Bind `:value` + `@input`, not a bare `v-model`

The component's pair is `value` / `input`. Under Vue 2 the removed
`model: { prop: 'value', event: 'input' }` option made a bare `v-model` desugar
onto it; **Vue 3 removed that option** and desugars `v-model` to
`:modelValue` + `@update:modelValue` instead — neither of which this component
declares. A bare `v-model` therefore binds nothing, silently: the selection
never reaches the parent and a form gated on it never validates.
:::

**Keyboard:**
- Arrow keys move focus across the grid (tabindex rotation: the focused card has `tabindex="0"`, others `-1`).
- Enter / Space on a focused card selects it.
- Tab moves focus out of the grid (no card-to-card Tab).

## Usage

```vue
<template>
  <CnNcWidgetGridPicker
    :value="selectedWidgetId"
    :widgets="ncWidgets"
    @input="selectedWidgetId = $event" />
</template>

<script>
import { CnNcWidgetGridPicker } from '@conduction/nextcloud-vue'

export default {
  components: { CnNcWidgetGridPicker },
  data() {
    return {
      selectedWidgetId: '',
      ncWidgets: [{ id: 'calendar', title: 'Calendar', iconUrl: '/apps/calendar/img/app.svg' }],
    }
  },
}
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `String` | `''` | The currently-selected widget id. Bind `:value` + `@input` explicitly — Vue 3 does not desugar a bare `v-model` onto this pair. |
| `widgets` | `Array<{ id, title?, iconUrl? }>` \| `object` | `[]` | The Nextcloud-discovered widgets to pick from. Accepts an array or an object map (PHP may serialise a sequential array as an object). |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `input` | `id` (string) | Selection changed; payload is the selected widget id string. |

## Related

- [`CnAddWidgetModal`](./cn-add-widget-modal.md) — The NC-widget sub-form uses this picker to choose a Dashboard API widget.
