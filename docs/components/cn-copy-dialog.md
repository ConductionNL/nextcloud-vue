---
sidebar_position: 17
---

import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnCopyDialog.md'

# CnCopyDialog

Two-phase single-item copy dialog with naming pattern selector. User picks a naming pattern, confirms, then sees success or error.

## Try it

<Playground component="CnCopyDialog" />

**Wraps**: NcDialog, NcButton, NcNoteCard, NcSelect

![CnCopyDialog showing naming pattern selection for copying an item](/img/screenshots/cn-copy-dialog.png)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `item` | Object | *(required)* | Item to copy |
| `nameField` | String | `'title'` | Field used as display name |
| `nameFormatter` | Function | `null` | Optional function `(item) => string` to format the display name. Overrides `nameField` when provided. |
| `include` | Array | `[]` | Link kinds a copy may take along, from the page's `config.copy.include`: `relationRows`, `incoming`, `files`. Each is listed with its linked items and a count, ticked by default. Empty keeps the dialog as it was. |
| `register` | String | `''` | Register slug of the item, for reading its links. Empty: the item's `@self.register`. |
| `schema` | String | `''` | Schema slug of the item. Empty: the item's `@self.schema`. |
| `dialogTitle` | String | `'Copy Item'` | |
| `patternLabel` | String | `'Naming pattern'` | |
| `successText` | String | `'Item successfully copied.'` | |
| `cancelLabel` | String | | |
| `closeLabel` | String | | |
| `confirmLabel` | String | | |

## Naming Patterns

| Pattern | Example |
|---------|---------|
| `copy-of` | Copy of Contact A |
| `name-copy` | Contact A - Copy |
| `name-parens` | Contact A (Copy) |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `confirm` | `\{ id, newName, include? \}` | Copy confirmed; `include` holds the ticked link kinds, only when the page lists links and the server can copy them |
| `close` | — | Dialog closed |

## Copying with links

When the page declares `config.copy.include`, the form phase lists, per included kind, what the item is linked to: **Used by** (objects that point at it), **Connections** (relation rows) and **Files**, each with its count, the first ten titles, and a checkbox ticked by default. A kind the page does not include is not listed. A page without `copy.include` shows the dialog exactly as before.

The copy itself is one request to OpenRegister's copy endpoint, made by the host (`CnIndexPage` does it): it creates the new object and its links together, so a failure leaves no half-linked copy. Call `setResult({ success, url, links })` with the per-link outcome the server returned; links with `ok: false` are listed with their reason, and `url` adds a link to the new object. A single-valued reference on another object is never moved to the copy.

Where the server has no copy endpoint (404 or 405), or the item's register and schema are not known, the list stays read-only with the note "Links are not copied yet. Only the fields are copied." and the copy carries the fields only.

## Public Methods

| Method | Description |
|--------|-------------|
| `setResult(\{ success?, error? \})` | Set operation result |

## Live demo

```vue
<template>
  <div>
    <button @click="open = true" style="padding: 6px 16px; border-radius: 4px; background: var(--color-primary-element); color: white; border: none; cursor: pointer;">Copy item</button>
    <CnCopyDialog
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
    async onConfirm({ id, newName }) {
      await new Promise(r => setTimeout(r, 800))
      this.$refs.dlg.setResult({ success: true })
    },
  },
}
</script>
```

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnCopyDialog.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnCopyDialog/CnCopyDialog.vue) and update automatically whenever the component changes.

<GeneratedRef />
