# Tasks: admin-settings-tabs

### Task 1: A tab strip in the admin shell
- **spec_ref**: `openspec/changes/admin-settings-tabs/specs/settings-board-look/spec.md#requirement-the-admin-shell-can-draw-a-tab-strip`
- **files**: `src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue`, `src/css/look-board.css`
- [x] Implement: `tabs`, `tabQueryKey`, `tab-<id>` slots, `tab-change`, first-tab chrome, panel grid
- [x] Test: `tests/components/CnAdminSettingsShellTabs.spec.js`
- [x] Test: e2e `e2e/l15-admin-settings-tabs.e2e.js` (ArrowRight, address, reload, cards side by side)
