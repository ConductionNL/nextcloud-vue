# CnAddWidgetModal

Unified, isolated host (ADR-004) for both the **add a dashboard widget** and **edit a dashboard widget** flows. The modal does NO API and NO grid work itself — it emits `submit({ type, content })` for the parent to persist. Per-type fields live in sub-form components registered in the shared [`dashboardWidgetRegistry`](../utilities/dashboard-widget-registry.md): the modal renders a type `<select>` from [`listWidgetTypes()`](../utilities/list-widget-types.md) and mounts the active type's sub-form via [`getWidgetTypeEntry()`](../utilities/get-widget-type-entry.md). State is owned by the [`useWidgetForm`](../utilities/composables/use-widget-form.md) composable.

## Usage

```vue
<template>
  <CnAddWidgetModal
    :show="showAddWidget"
    :preselected-type="deepLinkType"
    :editing-widget="editingWidget"
    @close="showAddWidget = false"
    @submit="onWidgetSubmit" />
</template>

<script>
import { CnAddWidgetModal } from '@conduction/nextcloud-vue'

export default {
  components: { CnAddWidgetModal },
  data() {
    return { showAddWidget: false, deepLinkType: null, editingWidget: null }
  },
  methods: {
    onWidgetSubmit({ type, content }) {
      // Persist the new/edited placement into your manifest delta.
      this.showAddWidget = false
    },
  },
}
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `show` | `Boolean` | `false` | Toggles visibility. Going `false → true` triggers `resetForm()` (create mode) or `loadEditingWidget()` when `editing-widget` is set. |
| `preselected-type` | `String` | `null` | When set, the type `<select>` is hidden and the form opens directly on this type (toolbar deep-links). |
| `editing-widget` | `{ type: string, content: object }` \| `null` | `null` | When set, the modal opens in edit mode: the type select is hidden (placement type is immutable) and the sub-form is pre-filled from `editingWidget.content`. Must expose `type` and `content`. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `close` | — | Fired on the cancel button, backdrop click, or Esc key. |
| `submit` | `{ type, content }` | Fired with the assembled payload for the parent to persist. |

## Related

- [`dashboardWidgetRegistry`](../utilities/dashboard-widget-registry.md) — Where per-type sub-forms and renderers are registered.
- [`useWidgetForm`](../utilities/composables/use-widget-form.md) — The form-state composable backing this modal.
