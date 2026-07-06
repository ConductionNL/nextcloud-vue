---
sidebar_position: 21
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnMassExportDialog.md'

# CnMassExportDialog

Export format selection dialog. Lets users pick a format and triggers export for selected items.

## Try it

<Playground component="CnMassExportDialog" />

**Wraps**: NcDialog, NcButton, NcSelect

![CnMassExportDialog showing export format selection](/img/screenshots/cn-mass-export-dialog.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dialogTitle` | String | `'Export objects'` | |
| `description` | String | `''` | Optional description text shown above the format selector |
| `formats` | Array | `[{ id: 'excel', label: 'Excel (.xlsx)' }, { id: 'csv', label: 'CSV (.csv)' }]` | Available export formats as `[{ id, label }]` objects |
| `defaultFormat` | String | `'excel'` | ID of the format selected by default |
| `entities` | Array | `[]` | Optional selectable entity types (`[{ id, label }]`) rendered as an extra picker above the format selector — the export-launcher case ("which dataset am I exporting?"). Empty hides the picker (pre-existing format-only dialog). Used by the manifest `type: "export"` action (see [dispatch-action](../utilities/dispatch-action.md)). |
| `defaultEntity` | String | `''` | ID of the entity selected by default (first entity when unset) |
| `entityLabel` | String | `'Entity'` | Label above the entity selector |
| `successText` | String | `'Export completed successfully.'` | Message shown in the result phase on success |
| `formatLabel` | String | `'Export format'` | Label above the format selector |
| `cancelLabel` | String | `'Cancel'` | |
| `closeLabel` | String | `'Close'` | Label for the close button shown in the result phase |
| `confirmLabel` | String | `'Export'` | |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `\{ format, entity? \}` | Export confirmed — `entity` is present only when the `entities` picker is configured |
| `close` | — | Dialog closed |

## Public Methods

| Method | Description |
|--------|-------------|
| `setResult(\{ success?, error?, data? \})` | Set export result |

## Live demo

```vue
<template>
  <div>
    <button @click="open = true" style="padding: 6px 16px; border-radius: 4px; background: var(--color-primary-element); color: white; border: none; cursor: pointer;">Export</button>
    <CnMassExportDialog
      v-if="open"
      ref="dlg"
      @confirm="onConfirm"
      @close="open = false" />
  </div>
</template>
<script>
export default {
  data() { return { open: false } },
  methods: {
    async onConfirm(payload) {
      await new Promise(r => setTimeout(r, 800))
      this.$refs.dlg.setResult({ success: true })
    },
  },
}
</script>
```

## Usage

```vue {static}
<CnMassExportDialog
  :items="selectedItems"
  :formats="['json', 'csv', 'xlsx']"
  @confirm="onExport"
  @close="showExport = false" />
```

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnMassExportDialog.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnMassExportDialog/CnMassExportDialog.vue) and update automatically whenever the component changes.

<GeneratedRef />
