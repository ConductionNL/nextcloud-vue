# Tasks: screens-avatar-cell-resolve

### Task 1: Resolved avatar cell
- **spec_ref**: `openspec/changes/screens-avatar-cell-resolve/specs/data-table/spec.md#requirement-an-avatar-cell-can-show-a-referenced-object`
- **files**: `src/components/CnFkResolveCell/CnFkResolveCell.vue`, `src/components/CnCellRenderer/CnCellRenderer.vue`
- [x] Implement: slot on CnFkResolveCell, `widgetProps.resolve` on the avatar cell
- [x] Test: `tests/components/CnCellRendererAvatarResolve.spec.js`; e2e `e2e/l8-avatar-cell-resolve.e2e.js` (fails without the change)
