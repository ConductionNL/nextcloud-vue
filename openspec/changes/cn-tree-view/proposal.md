# CnTreeView — recursive hierarchical tree widget

## Why

The pipelinq + opencatalogi triages flagged `CategoryManager` / `MenuDetailPageView` as customs because no lib widget provides a recursive tree with click-to-expand + per-row actions. The shape recurs whenever an app needs to surface nested categories / menu structures / org hierarchies.

## What

`src/components/CnTreeView/CnTreeView.vue` (parent, ~230 LOC) + `CnTreeNode.vue` (recursive child, ~140 LOC). Click-to-expand carets with `.sync`-able `expandedIds[]`. Click-to-select with `.sync`-able `selectedId`. `#actions` slot for inline per-row controls. Configurable `idKey` / `labelKey` / `childrenKey`. `expandAll()` / `collapseAll()` public methods. `expandAllOnMount` prop.

## Non-goals (follow-ups)

- **Drag-and-drop reorder** — tracked under #278 as a follow-up. The contract here is forward-compatible.
- **Keyboard navigation** — arrow keys / Space-Enter selection.
- **Lazy loading** — `loadChildren(node) => Promise<children>` for huge trees.

## References

- [nextcloud-vue#278](https://codeberg.org/Conduction/nextcloud-vue/issues/278).
- pipelinq `CategoryManager`, opencatalogi `MenuDetailPageView`.
