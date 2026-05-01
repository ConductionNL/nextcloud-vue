---
sidebar_position: 6
---

# CnContextMenu

Right-click context menu component that wraps NcActions with cursor positioning. Pair with the [`useContextMenu`](../utilities/composables/use-context-menu.md) composable for state management.

**Wraps**: NcActions, NcActionButton (from @nextcloud/vue)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | Boolean | `false` | Whether the menu is open. Use with `.sync` modifier, bound to `useContextMenu().isOpen`. |
| `actions` | Array | `[]` | Action definitions: `[{ label, icon?, handler?, disabled?, visible?, destructive? }]`. Same format as CnRowActions. `visible` (boolean or `(targetItem) => boolean`) hides the entry when falsy; omitted means always shown. |
| `targetItem` | Object/String/Number | `null` | The right-clicked item. Passed to action `handler` and `disabled` callbacks. Bind to `useContextMenu().targetItem`. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:open` | `boolean` | Emitted when open state changes (for `.sync` binding) |
| `action` | `{ action, row }` | Emitted when an action is clicked. `action` is the label string, `row` is the `targetItem`. |
| `close` | — | Emitted when the menu closes (click outside, action click, or Escape) |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| default | — | Custom NcActionButton content. Rendered after any `actions` array items. Use this for hardcoded buttons that don't fit the actions array pattern. |

## Usage

### With actions array (common case)

```vue
<template>
  <table>
    <tr
      v-for="row in rows"
      :key="row.id"
      @contextmenu.prevent="onContextMenu({ item: row, event: $event })">
      <!-- cells -->
    </tr>
  </table>

  <CnContextMenu
    :open.sync="contextMenuOpen"
    :actions="actions"
    :target-item="contextMenuRow"
    @action="onAction"
    @close="closeContextMenu" />
</template>

<script>
import { CnContextMenu, useContextMenu } from '@conduction/nextcloud-vue'

export default {
  components: { CnContextMenu },

  setup() {
    const {
      isOpen: contextMenuOpen,
      targetItem: contextMenuRow,
      open: onContextMenu,
      close: closeContextMenu,
    } = useContextMenu()

    return { contextMenuOpen, contextMenuRow, onContextMenu, closeContextMenu }
  },

  computed: {
    actions() {
      return [
        { label: 'Edit', icon: PencilIcon, handler: (row) => this.editRow(row) },
        { label: 'Delete', icon: TrashIcon, handler: (row) => this.deleteRow(row), destructive: true },
      ]
    },
  },
}
</script>
```

### With custom slot content

```vue
<CnContextMenu
  :open.sync="contextMenuOpen"
  @close="closeContextMenu">
  <NcActionButton close-after-click @click="onRename">
    <template #icon><PencilIcon :size="20" /></template>
    Rename
  </NcActionButton>
  <NcActionButton close-after-click @click="onDelete">
    <template #icon><TrashIcon :size="20" /></template>
    Delete
  </NcActionButton>
</CnContextMenu>
```

### Mixed (actions array + slot)

```vue
<CnContextMenu
  :open.sync="contextMenuOpen"
  :actions="commonActions"
  :target-item="contextMenuRow"
  @action="onAction"
  @close="closeContextMenu">
  <!-- Extra buttons after the array-driven ones -->
  <NcActionButton close-after-click @click="onSpecialAction">
    Special Action
  </NcActionButton>
</CnContextMenu>
```

## How It Works

1. The component renders a hidden NcActions trigger (`:manual-open="true"`, `:force-menu="true"`, `container="body"`)
2. `useContextMenu().open()` sets CSS custom properties on `document.documentElement` for cursor coordinates
3. The shared CSS (`context-menu.css`) overrides Popper.js transforms to position the menu at those coordinates
4. On close, `useContextMenu().close()` cleans up the DOM attributes

## Related

- [useContextMenu composable](../utilities/composables/use-context-menu.md) — State management (required)
- [CnRowActions](./cn-row-actions.md) — Three-dot action menu for table rows (non-context-menu)
- [CnIndexPage](./cn-index-page.md) — Uses CnContextMenu internally for table row right-click
