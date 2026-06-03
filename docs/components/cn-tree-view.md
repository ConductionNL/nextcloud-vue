---
sidebar_position: 32
---

# CnTreeView

Recursive hierarchical tree widget. Nested nodes with click-to-expand carets, optional badges + icons, an inline per-row actions slot, and select-on-click semantics. Configurable id / label / children keys so consumers don't have to reshape their data.

**Drag-and-drop reorder is deferred** to a follow-up under [nextcloud-vue#278](https://github.com/ConductionNL/nextcloud-vue/issues/278). The public contract here is forward-compatible — adding `draggable: true` later won't change existing v-model bindings.

## Try it

```vue
<CnTreeView
  :nodes="nodes"
  :expanded-ids.sync="expanded"
  :selected-id.sync="selected"
  @select="onSelect">
  <template #actions="{ node }">
    <button @click.stop="edit(node)">Edit</button>
    <button @click.stop="del(node)">Delete</button>
  </template>
</CnTreeView>
```

```js
const nodes = [
  { id: 1, label: 'Knowledge base', children: [
    { id: 2, label: 'How-tos',  badge: 12, children: [
      { id: 3, label: 'Reset password' },
    ]},
    { id: 4, label: 'Reference' },
  ]},
]
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `nodes` | `Array<{id,label,children?,icon?,badge?}>` | — *(required)* | Root-level nodes. |
| `expandedIds` | `Array<*>` | `[]` | Currently-expanded ids. Use `.sync`. |
| `selectedId` | Any | `null` | Currently-selected id. Use `.sync`. |
| `idKey` / `labelKey` / `childrenKey` | String | `'id'` / `'label'` / `'children'` | Override the key names on node objects. |
| `indent` | Number | `18` | Pixels of padding per depth level. |
| `title` / `description` | String | `''` | Optional header. |
| `emptyLabel` | String | `'No items.'` | Empty-state text. |
| `expandLabel` / `collapseLabel` | String | `'Expand'` / `'Collapse'` | A11y labels for the caret button. |
| `expandAllOnMount` | Boolean | `false` | Expand every node on mount (emits `update:expanded-ids`). |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `select` | `node` | Row clicked. Original node object. |
| `update:selected-id` | id | `.sync` of `selectedId`. |
| `update:expanded-ids` | `Array<id>` | `.sync` of `expandedIds`. |

## Public methods

| Method | Description |
|--------|-------------|
| `expandAll()` | Emit `update:expanded-ids` with every node id in the tree. |
| `collapseAll()` | Emit `update:expanded-ids` with `[]`. |

## Slots

- `#actions` — inline per-row actions. Scope: `{ node, depth }`. Click handlers should call `@click.stop` to avoid bubbling into the row's select.

## Follow-up

- Drag-drop reorder (`draggable: true` + `@drop` event surface).
- Keyboard navigation (arrow keys + Space/Enter for select).
- Lazy-load children (`loadChildren(node) => Promise<children>`).

## See also

- [`CnRelationshipGraph`](./cn-relationship-graph.md) for non-hierarchical link displays.
