# Tasks: board-version-card-full-width

### Task 1: The version card spans the grid
- **spec_ref**: `openspec/changes/board-version-card-full-width/specs/settings-board-look/spec.md#requirement-the-board-version-card-spans-the-settings-grid`
- **files**: `src/components/CnVersionInfoCard/CnVersionInfoCard.vue`, `src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue`
- [x] Implement: `wide` on CnVersionInfoCard (passed on under the board look), `versionCardWide` on the shell
- [x] Test: `tests/components/CnSettingsBoardLook.spec.js` (wide under the board look, not with `wide: false`, not without the look, the shell's default and opt-out). The rendered span of a wide section is covered by `e2e/l8-admin-settings-board-header.e2e.js`.
