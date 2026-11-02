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
  v-model:expanded-ids="expanded"
  v-model:selected-id="selected"
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
| `expandLabel` / `collapseLabel` | String or `(node) => string` | `'Expand'` / `'Collapse'` | A11y labels for the caret button. A function gives every row its own name, such as "Expand HR". |
| `toggleAttrs` | `(node, depth) => object` | `null` | Extra attributes for each row's caret button, such as a test id per node. |
| `rowAttrs` | `(node, depth) => object` | `null` | Extra attributes for each row: a class, `data-*` attributes, or a `role` and `aria-label`. `class` and `style` merge with the row's own. |
| `focusableRows` | Boolean | `false` | Rows get `tabindex="0"`, and Enter or Space on a row selects its node, like a click. Keys pressed on the caret or an action inside the row stay theirs. A focused row shows a focus ring in `--color-primary-element`. |
| `expandAllOnMount` | Boolean | `false` | Expand every node on mount (emits `update:expanded-ids`). |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `select` | `node` | Row clicked, or Enter or Space on a focusable row. Original node object. |
| `update:selected-id` | id | `.sync` of `selectedId`. |
| `update:expanded-ids` | `Array<id>` | `.sync` of `expandedIds`. |

## Public methods

| Method | Description |
|--------|-------------|
| `expandAll()` | Emit `update:expanded-ids` with every node id in the tree. |
| `collapseAll()` | Emit `update:expanded-ids` with `[]`. |

## Slots

- `#actions` — inline per-row actions. Scope: `{ node, depth }`. Click handlers should call `@click.stop` to avoid bubbling into the row's select.
- `#label` — the label of every row, at every depth. Scope: `{ node, depth, expanded }`. Use it for an icon, a marker or a test id beside the text. Unused, the row shows `node[labelKey]`.

```vue
<CnTreeView :nodes="dashboards" label-key="name">
  <template #label="{ node }">
    <CnDashboardIcon :name="node.icon" :size="20" />
    <span :data-testid="`dashboard-${node.uuid}`">{{ node.name }}</span>
  </template>
</CnTreeView>
```

## Per-node names, attributes and keyboard

All off by default; without them the tree renders as before. A dashboard switcher that names each caret, keeps its test ids and lets keyboard users open a dashboard:

```vue
<CnTreeView
  :nodes="dashboards"
  label-key="name"
  id-key="uuid"
  :expand-label="(node) => t('app', 'Expand {name}', { name: node.name })"
  :collapse-label="(node) => t('app', 'Collapse {name}', { name: node.name })"
  :toggle-attrs="(node) => ({ 'data-testid': `tree-expand-${node.uuid}` })"
  :row-attrs="(node, depth) => ({
    role: 'button',
    'aria-label': node.name,
    'data-depth': depth,
    class: { active: node.uuid === activeUuid },
  })"
  focusable-rows
  @select="open" />
```

## Follow-up

- Drag-drop reorder (`draggable: true` + `@drop` event surface).
- Keyboard navigation (arrow keys + Space/Enter for select).
- Lazy-load children (`loadChildren(node) => Promise<children>`).

## See also

- [`CnRelationshipGraph`](./cn-relationship-graph.md) for non-hierarchical link displays.
