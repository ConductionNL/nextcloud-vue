# CnMenuItemEditor

Recursive row editor used by the menu widget form. Renders inline label / url inputs, an icon picker ([`CnIconBrowser`](./cn-icon-browser.md) — the same picker every other widget form uses, not a free-text field), plus per-row **Add Children** and **Remove** actions. The "Add Children" button is hidden once the row reaches depth 3 so the user cannot create a tree the server would reject. The icon picker is hidden entirely when `showIcons` is `false`, since the widget won't render icons either.

Field changes bubble up via the `update-item` event with the row's `path` (an index list) so the parent form can mutate the canonical `items` array in one place. The component recurses into its own `children`, passing each child an extended `path` and the same `showIcons` value.

## Usage

```vue
<template>
  <CnMenuItemEditor
    v-for="(item, index) in items"
    :key="index"
    :item="item"
    :depth="1"
    :path="[index]"
    @add-child="onAddChild"
    @remove-item="onRemoveItem"
    @update-item="onUpdateItem" />
</template>

<script>
import { CnMenuItemEditor } from '@conduction/nextcloud-vue'

export default {
  components: { CnMenuItemEditor },
  data() {
    return { items: [{ label: 'Home', url: '/', icon: 'Home', children: [] }] }
  },
  methods: {
    onAddChild({ path }) { /* push a child at items[...path].children */ },
    onRemoveItem({ path }) { /* splice the item at path */ },
    onUpdateItem({ path, item }) { /* write item back at path */ },
  },
}
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `item` | `{ label, url, icon, children? }` | — | Single menu item being edited. |
| `depth` | `Number` | `1` | 1-indexed depth — drives the indent and the depth label. |
| `path` | `Number[]` | — | Path of indices from the root to this item (e.g. `[0, 2]`). |
| `showIcons` | `Boolean` | `true` | Whether the widget's "Show Icons" option is enabled. Hides the icon picker when off; forwarded unchanged to child rows. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `add-child` | `{ path }` | Fired to add a child row; payload carries the parent's index path. |
| `remove-item` | `{ path }` | Fired to remove a row; payload carries the row's index path. |
| `update-item` | `{ path, item }` | Fired when a field changes; payload carries the row's index path and the updated item object. |

## Related

- [`CnAddWidgetModal`](./cn-add-widget-modal.md) — Hosts the menu widget form that uses this editor.
