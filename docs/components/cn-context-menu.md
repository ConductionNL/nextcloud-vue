---
sidebar_position: 6
---

# CnContextMenu

Right-click context menu component that wraps NcActions with cursor positioning. Supports an optional **panels API** for arbitrary custom content (grids, inputs, custom components) beyond the NcActions action-list allowlist. Pair with the [`useContextMenu`](../utilities/composables/use-context-menu.md) composable for state management.

**Wraps**: NcActions, NcActionButton (from @nextcloud/vue)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | Boolean | `false` | Whether the menu is open. Use with `.sync` modifier, bound to `useContextMenu().isOpen`. |
| `actions` | Array | `[]` | Action definitions: `[{ label, icon?, handler?, disabled?, visible?, title?, destructive? }]`. Same format as CnRowActions. `visible` (boolean or `(targetItem) => boolean`) hides the entry when falsy; omitted means always shown. `title` (string or `(targetItem) => string`) renders as a native tooltip — useful for explaining why a `disabled` entry is disabled. |
| `targetItem` | Object/String/Number | `null` | The right-clicked item. Passed to action `handler` and `disabled` callbacks, and forwarded to custom panel slots as the `targetItem` scope binding. Bind to `useContextMenu().targetItem`. |
| `activePanel` | String | `null` | Name of the currently active custom panel, or `null` for the default action list. When set, the matching `#panel:<name>` slot is rendered in place of NcActions. Use with `.sync` so panel slots can call `back()` to clear it. Resets to `null` on close. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:open` | `boolean` | Emitted when open state changes (for `.sync` binding) |
| `update:activePanel` | `string \| null` | Emitted when the active panel changes (for `.sync` binding). Fired with `null` when a panel slot calls `back()` or when the menu closes. |
| `action` | `{ action, row }` | Emitted when an action is clicked. `action` is the label string, `row` is the `targetItem`. |
| `close` | — | Emitted when the menu closes (click outside, action click, panel backdrop click, or Escape) |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| default | — | Custom NcActionButton content for the default panel. Rendered inside `NcActions` after any `actions` array items. Subject to NcActions' child filter — only `NcActionButton`, `NcActionButtonGroup`, `NcActionInput`, `NcActionLink`, `NcActionRouter`, `NcActionCheckbox`, `NcActionRadio`, `NcActionTextEditable` are rendered. Use a custom panel for anything else. |
| `panel:<name>` | `{ back, close, targetItem }` | Free-form panel content shown when `activePanel === '<name>'`. Bypasses the NcActions child filter — put any markup here (grids, inputs, custom components). `back()` returns to the default action list. `close()` closes the entire menu. `targetItem` is the right-clicked item. |

## Usage

### With actions array (common case)

Right-click one of the rows below:

```vue
<template>
  <div>
    <div
      v-for="row in rows"
      :key="row.id"
      style="padding: 10px 12px; border: 1px solid var(--color-border); border-radius: 4px; margin-bottom: 4px; cursor: context-menu; user-select: none;"
      @contextmenu.prevent="e => onContextMenu({ item: row, event: e })">
      {{ row.title }}
    </div>
    <CnContextMenu
      v-model:open="contextMenuOpen"
      :actions="actions"
      :target-item="contextMenuRow"
      @close="closeContextMenu" />
    <p v-if="lastAction" style="margin-top: 8px; font-size: 13px; color: var(--color-text-maxcontrast);">Last: {{ lastAction }}</p>
  </div>
</template>
<script>
import { useContextMenu } from '@conduction/nextcloud-vue'
export default {
  setup() {
    const {
      isOpen: contextMenuOpen,
      targetItem: contextMenuRow,
      open: onContextMenu,
      close: closeContextMenu,
    } = useContextMenu()
    return { contextMenuOpen, contextMenuRow, onContextMenu, closeContextMenu }
  },
  data() {
    return {
      lastAction: '',
      rows: [
        { id: 1, title: 'Item one — right-click me' },
        { id: 2, title: 'Item two — right-click me' },
      ],
      actions: [
        { label: 'Edit', handler: (row) => { this.lastAction = 'Edit: ' + row.title } },
        { label: 'Delete', handler: (row) => { this.lastAction = 'Delete: ' + row.title }, destructive: true },
      ],
    }
  },
}
</script>
```

### With custom slot content

```vue {static}
<CnContextMenu
  v-model:open="contextMenuOpen"
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

```vue {static}
<CnContextMenu
  v-model:open="contextMenuOpen"
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

### Custom panels (free-form content)

For submenu-style flows that don't fit the action-list shape — colour pickers,
icon grids, mini-forms — use a custom panel. The default panel acts as a menu
of entry points; each entry sets `activePanel` to swap the menu's content with
the matching slot, which renders without the NcActions child filter.

```vue {static}
<CnContextMenu
  v-model:open="open"
  v-model:active-panel="panel"
  @close="onClose">
  <!-- Default panel: entry points -->
  <NcActionButton @click="panel = 'colour'">
    <template #icon><PaletteIcon :size="20" /></template>
    Change colour
  </NcActionButton>
  <NcActionButton @click="panel = 'icon'">
    <template #icon><PaletteSwatchIcon :size="20" /></template>
    Change icon
  </NcActionButton>

  <!-- Custom 'colour' panel: anything goes here -->
  <template #panel:colour="{ back, close }">
    <button class="back-btn" @click="back">← Back</button>
    <div class="colour-grid">
      <button
        v-for="c in colours"
        :key="c"
        :style="{ background: c }"
        @click="applyColour(c); close()" />
    </div>
  </template>

  <!-- Custom 'icon' panel: search field + grid -->
  <template #panel:icon="{ back, close, targetItem }">
    <button @click="back">← Back</button>
    <input v-model="iconSearch" placeholder="Search icons" />
    <div class="icon-grid">
      <button
        v-for="icon in filteredIcons"
        :key="icon.key"
        @click="applyIcon(targetItem, icon.key); close()">
        <component :is="icon.component" />
      </button>
    </div>
  </template>
</CnContextMenu>
```

**Scope bindings** for `#panel:<name>`:
- `back()` — clear `activePanel`, returning to the default action list (same menu, no reposition).
- `close()` — close the entire menu, equivalent to clicking outside.
- `targetItem` — forwarded from the `targetItem` prop, identical to what action handlers receive.

Custom panels handle their own close-on-Escape and close-on-click-outside —
clicking the transparent backdrop behind the panel closes the menu.

## How It Works

1. The component renders a hidden NcActions trigger (`:manual-open="true"`, `:force-menu="true"`, `container="body"`)
2. `useContextMenu().open()` sets CSS custom properties on `document.documentElement` for cursor coordinates
3. The shared CSS (`context-menu.css`) overrides Popper.js transforms to position the menu at those coordinates
4. On close, `useContextMenu().close()` cleans up the DOM attributes

## Related

- [useContextMenu composable](../utilities/composables/use-context-menu.md) — State management (required)
- [CnRowActions](./cn-row-actions.md) — Three-dot action menu for table rows (non-context-menu)
- [CnIndexPage](./cn-index-page.md) — Uses CnContextMenu internally for table row right-click
