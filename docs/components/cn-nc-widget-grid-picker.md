# CnNcWidgetGridPicker

Renders the Nextcloud-discovered widget catalog as a responsive CSS-grid of icon cards. Each card carries the widget's icon, a single-line ellipsised title, and shows a selected-state border + check overlay when active.

`v-model` exposes the widget id (string) — the same shape a `<select>` would use, so the parent form's `update:content` payload is unchanged. Internally `v-model` maps to the `value` prop + the `input` event.

**Keyboard:**
- Arrow keys move focus across the grid (tabindex rotation: the focused card has `tabindex="0"`, others `-1`).
- Enter / Space on a focused card selects it.
- Tab moves focus out of the grid (no card-to-card Tab).

## Usage

```vue
<template>
  <CnNcWidgetGridPicker
    v-model="selectedWidgetId"
    :widgets="ncWidgets" />
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
| `value` | `String` | `''` | The currently-selected widget id (`v-model` value). |
| `widgets` | `Array<{ id, title?, iconUrl? }>` \| `object` | `[]` | The Nextcloud-discovered widgets to pick from. Accepts an array or an object map (PHP may serialise a sequential array as an object). |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `input` | `id` (string) | `v-model` update; payload is the selected widget id string. |

## Related

- [`CnAddWidgetModal`](./cn-add-widget-modal.md) — The NC-widget sub-form uses this picker to choose a Dashboard API widget.
