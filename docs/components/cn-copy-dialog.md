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
| `confirm` | `\{ id, newName \}` | Copy confirmed |
| `close` | — | Dialog closed |

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
