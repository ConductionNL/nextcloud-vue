# CnWidgetStyleEditorModal

Isolated host (ADR-004) for editing a single dashboard-widget's chrome: its title override, background colour, and icon. It is a pure editor — it does NO API and NO grid work. On **Save** it mutates the passed `widget` object in place (writing `widget.styleConfig`, `widget.showTitle`, `widget.customTitle`, `widget.customIcon`) and emits `save` with the same object, so the parent can persist. The draft is a working copy; nothing on the `widget` changes until Save — Cancel / Esc / backdrop discard the draft.

## Usage

```vue
<template>
  <CnWidgetStyleEditorModal
    :show="showStyleEditor"
    :widget="activeWidget"
    :deletable="!activeWidget.compulsory"
    @close="showStyleEditor = false"
    @save="onStyleSave"
    @delete="onWidgetDelete" />
</template>

<script>
import { CnWidgetStyleEditorModal } from '@conduction/nextcloud-vue'

export default {
  components: { CnWidgetStyleEditorModal },
  data() {
    return { showStyleEditor: false, activeWidget: {} }
  },
  methods: {
    onStyleSave(widget) { /* persist widget.styleConfig + chrome fields */ },
    onWidgetDelete(widget) { /* remove the placement */ },
  },
}
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `show` | `Boolean` | `false` | Toggles visibility. Going `false → true` re-seeds the draft from `widget`. |
| `widget` | `{ styleConfig?, showTitle?, customTitle?, customIcon?, title? }` | — | The widget chrome being edited. Its `styleConfig` and chrome fields (`showTitle`, `customTitle`, `customIcon`) are mutated in place on Save. |
| `deletable` | `Boolean` | `true` | Whether to show the Delete button (`false` for compulsory widgets). |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `close` | — | Fired on Cancel, backdrop click, or Esc — never mutates the widget. |
| `save` | `widget` (object) | Fired on Save with the in-place-mutated `widget`. |
| `delete` | `widget` | Fired when the Delete button is clicked. Payload is the `widget`. |

## Related

- [`CnAddWidgetModal`](./cn-add-widget-modal.md) — The add/edit-content companion modal.
