# Tasks: admin-shell-provides-its-look

### Task 1: The shell provides its look
- **spec_ref**: `openspec/changes/admin-shell-provides-its-look/specs/settings-board-look/spec.md#requirement-the-admin-settings-shell-hands-its-look-to-what-it-holds`
- **files**: `src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue`
- [x] Implement: `provide('cnLook', look)` in `setup`
- [x] Test: `tests/components/CnSettingsBoardLook.spec.js` (the version card and a slot probe follow the shell's look; nothing changes without it)
