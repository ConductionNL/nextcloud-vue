# Tasks: admin-settings-lazy-tabs

### Task 1: The admin shell can mount only the open tab
- **spec_ref**: `openspec/changes/admin-settings-lazy-tabs/specs/settings-board-look/spec.md#requirement-the-admin-shell-can-mount-only-the-open-tab`
- **files**: `src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue`, `docs/components/cn-admin-settings-shell.md`
- [x] Implement: `lazyTabs` prop, `v-if` on the `tab-<id>` slot
- [x] Test: `tests/components/CnAdminSettingsShellLazyTabs.spec.js`; e2e `e2e/l25-admin-settings-lazy-tabs.e2e.js` (`?l8=admin-lazy-tabs`)
