---
sidebar_position: 5
---

# useContextMenu

Composable for adding a right-click context menu positioned at the cursor to any component. Manages open/close state, cursor positioning via CSS custom properties, and action helpers.

Uses the same pattern as the Nextcloud Files app: sets CSS custom properties and a data attribute on `document.documentElement`, with shared CSS that overrides Popper.js transforms to place the `<NcActions>` menu at the click coordinates.

## Signature

```js
import { useContextMenu } from '@conduction/nextcloud-vue'

const { isOpen, targetItem, open, close, isActionDisabled, triggerAction } = useContextMenu()
```

## Return Value

| Key | Type | Description |
|-----|------|-------------|
| `isOpen` | `Ref<boolean>` | Whether the context menu is open. Bind to NcActions via `:open.sync="isOpen"`. |
| `targetItem` | `Ref<any>` | The item that was right-clicked (row, folder, etc.). `null` when closed. |
| `open({ item, event })` | Function | Open the menu at the cursor position. Sets CSS vars and data attribute on `documentElement`. |
| `close()` | Function | Close the menu and clean up DOM attributes. Use as `@close` handler on NcActions. |
| `isActionDisabled(action)` | Function | Resolve `action.disabled` — supports both `boolean` and `(item) => boolean`. |
| `triggerAction(action)` | Function | Call `action.handler(targetItem)` and return `{ action: label, row: item }` for emitting. |

## Usage

### In an Options API component (with setup)

```vue
<template>
  <!-- Emit the contextmenu event from your interactive element -->
  <tr
    v-for="row in rows"
    :key="row.id"
    @contextmenu.prevent="onRowContextMenu({ row, event: $event })">
    <!-- cells... -->
  </tr>

  <!-- Context menu (hidden trigger, opens at cursor) -->
  <NcActions
    :open.sync="contextMenuOpen"
    :manual-open="true"
    :force-menu="true"
    class="my-context-menu"
    container="body"
    @close="closeContextMenu">
    <NcActionButton
      v-for="action in actions"
      :key="action.label"
      :disabled="isContextActionDisabled(action)"
      :class="{ 'cn-row-action--destructive': action.destructive }"
      close-after-click
      @click="onContextAction(action)">
      <template v-if="action.icon" #icon>
        <component :is="action.icon" :size="20" />
      </template>
      {{ action.label }}
    </NcActionButton>
  </NcActions>
</template>

<script>
import { NcActions, NcActionButton } from '@nextcloud/vue'
import { useContextMenu } from '@conduction/nextcloud-vue'

export default {
  components: { NcActions, NcActionButton },

  setup() {
    const {
      isOpen: contextMenuOpen,
      targetItem: contextMenuRow,
      open: openContextMenu,
      close: closeContextMenu,
      isActionDisabled: isContextActionDisabled,
      triggerAction: triggerContextAction,
    } = useContextMenu()

    return {
      contextMenuOpen,
      contextMenuRow,
      openContextMenu,
      closeContextMenu,
      isContextActionDisabled,
      triggerContextAction,
    }
  },

  methods: {
    onRowContextMenu({ row, event }) {
      this.openContextMenu({ item: row, event })
    },
    onContextAction(action) {
      const payload = this.triggerContextAction(action)
      this.$emit('action', payload)
    },
  },
}
</script>

<style scoped>
.my-context-menu {
  /* Hide the NcActions trigger button — menu opens only via right-click */
  display: none;
}
</style>
```

### Key points

- The `<NcActions>` trigger button must be hidden with scoped CSS (`display: none` or `clip`) since the menu opens programmatically via right-click, not by clicking the trigger.
- The shared positioning CSS (`src/css/context-menu.css`) is auto-imported via the library's CSS entry point — no manual import needed.
- Only one context menu can be open at a time. Opening a new one while another is open will work correctly because the CSS vars and data attribute are global singletons on `documentElement`.

## How it works

1. `open()` sets `--cn-ctx-menu-x` and `--cn-ctx-menu-y` CSS custom properties on `document.documentElement` and adds a `data-cn-ctx-menu` attribute
2. The shared CSS (`context-menu.css`) uses `html[data-cn-ctx-menu] .v-popper__popper` to override Popper.js transforms, placing the menu at those coordinates
3. `close()` removes the CSS vars and data attribute, restoring normal Popper behavior
4. `onBeforeUnmount` calls `close()` automatically if the component unmounts while the menu is open

## Components using this composable

- **CnIndexPage** — Right-click context menu on table rows, rendering `mergedActions` (same actions as the three-dot row menu)
