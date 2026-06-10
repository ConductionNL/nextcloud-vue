# Tasks: CnTreeView

- [x] CnTreeView.vue + CnTreeNode.vue (recursive) + index.
- [x] Barrels + jsdoc-baselines (CnTreeView: 1, CnTreeNode: 1).
- [x] 12 tests (expand/collapse, select, configurable keys, badges, expandAll/collapseAll, empty state).
- [x] Docs page.
- [x] openspec change docs.

## Follow-up

- [~] Drag-drop reorder. [DEFERRED: separate follow-up change — needs vue-draggable peer + accessibility audit; not in scope for the v1.0 CnTreeView API.]
- [~] Keyboard navigation. [DEFERRED: WCAG-AA `aria-tree` keyboard contract (Home/End/arrow expansion) merits its own change so the contract is testable independently.]
- [~] Lazy load children. [DEFERRED: `loadChildren(node) => Promise<children>` prop hook needs a documented async-error contract; deferred to a `cn-tree-view-async` follow-up.]
