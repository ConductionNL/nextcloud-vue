---
sidebar_position: 16
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnDeleteDialog.md'

# CnDeleteDialog

Two-phase single-item delete confirmation dialog. Shows a warning, waits for API response, then shows success or error.

## Try it

<Playground component="CnDeleteDialog" />

**Wraps**: NcDialog, NcButton, NcNoteCard, NcLoadingIcon

![CnDeleteDialog confirmation dialog with warning text and Cancel/Delete buttons](/img/screenshots/cn-delete-dialog.png)

![CnDeleteDialog confirmation with warning text and Cancel/Delete buttons](/img/screenshots/cn-delete-dialog.png)

## Live demo

```vue
<template>
  <div>
    <button @click="open = true" style="padding: 6px 16px; border-radius: 4px; background: var(--color-primary-element); color: white; border: none; cursor: pointer;">Delete item</button>
    <CnDeleteDialog
      v-if="open"
      ref="dlg"
      :item="{ id: 1, title: 'Annual Report 2024' }"
      @confirm="onConfirm"
      @close="open = false" />
  </div>
</template>
<script>
export default {
  data() { return { open: false } },
  methods: {
    async onConfirm(id) {
      await new Promise(r => setTimeout(r, 800))
      this.$refs.dlg.setResult({ success: true })
    },
  },
}
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `item` | Object | *(required)* | Item to delete (must have id) |
| `nameField` | String | `'title'` | Field used as display name |
| `nameFormatter` | Function | `null` | Optional function `(item) => string` to format the display name. Overrides `nameField` when provided. |
| `dialogTitle` | String | `'Delete Item'` | |
| `warningText` | String | `'Are you sure...'` | Supports `\{name\}` placeholder |
| `successText` | String | `'Item successfully deleted.'` | |
| `cancelLabel` | String | | Cancel button label |
| `closeLabel` | String | | Close button label |
| `confirmLabel` | String | | Confirm button label |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `id` | Delete confirmed by user |
| `close` | — | Dialog closed |

## Public Methods

| Method | Description |
|--------|-------------|
| `setResult(\{ success?, error? \})` | Set operation result after API call |

## Custom Name Formatting

When items don't have a simple name field, use `nameFormatter` to build a display name from any item properties:

```vue {static}
<CnDeleteDialog
  :item="auditTrail"
  :name-formatter="(item) => t('myapp', 'Audit Trail #{id}', { id: item.id })"
  @confirm="onDeleteConfirm"
  @close="deleteItem = null" />
```

## Two-Phase Pattern

```vue {static}
<template>
  <CnDeleteDialog
    v-if="deleteItem"
    ref="deleteDialog"
    :item="deleteItem"
    @confirm="onDeleteConfirm"
    @close="deleteItem = null" />
</template>

<script>
export default {
  methods: {
    async onDeleteConfirm(id) {
      try {
        await api.delete(id)
        this.$refs.deleteDialog.setResult({ success: true })
      } catch (error) {
        this.$refs.deleteDialog.setResult({ error: error.message })
      }
    },
  },
}
</script>
```

## Board look

Set `look: "board"` in the manifest (or pass `look="board"` to the dialog) and the dialog draws the board dialog of the screens. An app that sets nothing renders exactly as before.

| Prop | Default | What it does |
| --- | --- | --- |
| `look` | follows the app | `board` or `nextcloud`. The prop wins over the app. |
| `width` | per component | `confirm` (560), `form` (640) or `wizard` (720). No other width is reachable. |
| `eyebrow` | empty | A context line above the title, uppercase 13px. Not part of the accessible name. |
| `subtitle` | empty | A sentence under the title. |

Widths are capped at the viewport minus 32px. Theme hooks: `--cn-dialog-danger` (fill of a destructive primary, default `--color-error`), `--cn-dialog-eyebrow-color` and `--cn-dialog-eyebrow-transform`.

### Destructive wording and type-to-confirm

In the board look the body opens with a sentence that names the item in bold ("Are you sure you want to permanently delete **name**? This action cannot be undone."). A `warningText` you set renders under it as a warning note. Pass `:irreversible="false"` to drop the last sentence.

Pass `confirmValue` to ask the user to type a value. The delete button stays disabled (`aria-disabled="true"`, 45% opacity) until the field matches exactly. `confirmFieldLabel` labels the field; `confirmLabel` stays the button label. This holds in both looks. `CnMassDeleteDialog` and `CnConfirmDialog` take the same props.

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnDeleteDialog.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnDeleteDialog/CnDeleteDialog.vue) and update automatically whenever the component changes.

<GeneratedRef />
