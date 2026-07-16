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
| `editing-widget` | `{ type: string, content: object }` \| `null` | `null` | When set, the modal opens in edit mode: the type select is hidden (placement type is immutable) and the sub-form is pre-filled from `editingWidget.content`. Must expose `type` and `content`. The Appearance chrome is also seeded from it (`showTitle` / `customTitle` / `customIcon` / `styleConfig.backgroundColor`, falling back to `content`). |
| `upload-fn` | `Function` \| `null` | `null` | Optional upload transport for the Appearance icon picker: `async (dataUrl: string) => ({ url })` — the icon picker reads the chosen file to a data URL and hands *that* to this function. When null, the icon picker embeds the uploaded image as a data URL (same-origin, CSP-safe). |
| `file-upload-fn` | `Function` \| `null` | `null` | Optional raw-file upload transport forwarded to the active sub-form as its `file-upload-fn`: `async (file: File) => ({ url })`. A separate prop from `upload-fn` (icon picker, data URL) so the File-typed transport can never reach a sub-form expecting a data URL (e.g. the header form). Sub-forms such as the image widget defer the upload to submit and hand over the raw `File`; the modal awaits the sub-form's `commit()` before emitting `submit`. |

The modal also renders a shared **Appearance** section beneath the per-type
sub-form — Show title, Custom title, Background (`NcColorPicker`) and Icon
(`CnIconPicker`) — so every consumer gets the same add/edit chrome. The chosen
chrome rides alongside the content in the submit payload (see below).

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `close` | — | Fired on the cancel button, backdrop click, or Esc key. |
| `submit` | `{ type, content, chrome: { showTitle, customTitle, customIcon, backgroundColor } }` | Fired with the assembled payload (content + Appearance chrome) for the parent to persist. When the active sub-form exposes an async `commit()` (e.g. the image widget uploads its pending file), the modal awaits it first — a commit failure keeps the modal open and suppresses this event. |

## Related

- [`dashboardWidgetRegistry`](../utilities/dashboard-widget-registry.md) — Where per-type sub-forms and renderers are registered.
- [`useWidgetForm`](../utilities/composables/use-widget-form.md) — The form-state composable backing this modal.
