---
sidebar_position: 20
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnMassCopyDialog.md'

# CnMassCopyDialog

Two-phase mass copy dialog with naming pattern. Allows users to define a naming pattern for copied items.

## Try it

<Playground component="CnMassCopyDialog" />

**Wraps**: NcDialog, NcButton, NcTextField

![CnMassCopyDialog showing bulk copy with naming pattern and item list](/img/screenshots/cn-mass-copy-dialog.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | Array | `[]` | Items to copy (`[\{ id, name \}]`) |
| `nameField` | String | `'title'` | Field to display as item name |
| `nameFormatter` | Function | `null` | Optional function `(item) => string` to format item names. Overrides `nameField` when provided. |
| `include` | Array | `[]` | Link kinds a copy may take along (`relationRows`, `incoming`, `files`), from the page's `config.copy.include`. Each is offered ticked; the dialog shows the kinds, not every row's links. Empty keeps the dialog as it was. |
| `register` | String | `''` | Register slug of the items, for checking the server can copy links. Empty: the first item's `@self.register`. |
| `schema` | String | `''` | Schema slug of the items. Empty: the first item's `@self.schema`. |
| `dialogTitle` | String | `'Copy items'` | |
| `patternLabel` | String | `'Naming pattern'` | |
| `patternPlaceholder` | String | `'\{name\} (copy)'` | |
| `emptyText` | String | `'No items selected for copying.'` | Message shown when all items have been removed from the list |
| `successText` | String | `'Items successfully copied.'` | Message shown in the result phase on success |
| `cancelLabel` | String | `'Cancel'` | |
| `closeLabel` | String | `'Close'` | Label for the close button shown in the result phase |
| `confirmLabel` | String | `'Copy'` | |
| `removeLabel` | String | `'Remove from list'` | Tooltip/label for the per-item remove button |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `\{ ids, getName, include? \}` | Copy confirmed; `include` holds the ticked link kinds, only when the page lists links and the server can copy them |
| `close` | — | Dialog closed |

## Copying with links

With `include` the dialog adds a **Links to take along** section: the included kinds, ticked, one checkbox each. Each row is copied with one request to OpenRegister's copy endpoint carrying the same kinds, and the result lists the links the server refused, with their reason. Without the endpoint the section is read-only with a note and the copy carries the fields only. See [CnCopyDialog](./cn-copy-dialog.md#copying-with-links).

## Public Methods

| Method | Description |
|--------|-------------|
| `setResult(\{ success?, error?, results? \})` | Set result per item |

## Live demo

```vue
<template>
  <div>
    <button @click="open = true" style="padding: 6px 16px; border-radius: 4px; background: var(--color-primary-element); color: white; border: none; cursor: pointer;">Copy selected (2)</button>
    <CnMassCopyDialog
      v-if="open"
      ref="dlg"
      :items="[{ id: 1, title: 'Report A' }, { id: 2, title: 'Report B' }]"
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
<CnMassCopyDialog
  ref="massCopyDialog"
  :items="selectedItems"
  @confirm="onMassCopy"
  @close="showMassCopy = false" />
```

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnMassCopyDialog.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnMassCopyDialog/CnMassCopyDialog.vue) and update automatically whenever the component changes.

<GeneratedRef />
