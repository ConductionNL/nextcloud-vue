---
sidebar_position: 5
---

# useContextMenu

Composable for managing right-click context menu positioning and state. Handles cursor-based positioning through CSS custom properties and a data attribute on `document.documentElement`.

Pair with the [`CnContextMenu`](../../components/cn-context-menu.md) component to avoid writing NcActions boilerplate — the composable manages state, the component renders the menu.

## Signature

```js
import { useContextMenu } from '@conduction/nextcloud-vue'

const { isOpen, targetItem, open, close, isActionDisabled, triggerAction } = useContextMenu()
```

## Return Value

| Key | Type | Description |
|-----|------|-------------|
| `isOpen` | `Ref<boolean>` | Whether the context menu is open. Bind to CnContextMenu via `:open.sync="isOpen"`. |
| `targetItem` | `Ref<any>` | The item that was right-clicked (`null` when closed). Bind to CnContextMenu via `:target-item`. |
| `open({ item, event })` | Function | Open the menu at the cursor position. Sets CSS vars and data attribute on `documentElement`. |
| `close()` | Function | Close the menu and clean up DOM. Use as `@close` handler on CnContextMenu. |
| `isActionDisabled(action)` | Function | Resolve `action.disabled` — supports both `boolean` and `(item) => boolean`. Only needed when not using CnContextMenu (which handles this internally). |
| `triggerAction(action)` | Function | Call `action.handler(targetItem)`, return `{ action, row }`. Only needed when not using CnContextMenu. |

## Usage

### With CnContextMenu (recommended)

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
}
</script>
```

### Without CnContextMenu (advanced — custom NcActions)

For cases where CnContextMenu's template doesn't fit (e.g., complex conditional rendering), use `isActionDisabled` and `triggerAction` directly with your own NcActions instance. See the composable's return value table for details.

## How it works

1. `open()` sets `--cn-ctx-menu-x` and `--cn-ctx-menu-y` CSS custom properties on `document.documentElement` and adds a `data-cn-ctx-menu` attribute
2. The shared CSS (`context-menu.css`) uses `html[data-cn-ctx-menu] .v-popper__popper` to override Popper.js transforms, placing the menu at those coordinates
3. `close()` removes the CSS vars and data attribute, restoring normal Popper behavior
4. `onBeforeUnmount` calls `close()` automatically if the component unmounts while the menu is open

## Related

- [CnContextMenu](../../components/cn-context-menu.md) — Template component (recommended pairing)
- [CnIndexPage](../../components/cn-index-page.md) — Uses both internally for table row right-click
