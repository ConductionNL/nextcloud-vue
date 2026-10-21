# Tasks: user-settings-dialog-dq-board

### Task 1: The user settings dialog follows the Dq board
- **spec_ref**: `openspec/changes/user-settings-dialog-dq-board/specs/user-settings-dialog-dq-board/spec.md#requirement-the-user-settings-dialog-follows-the-dq-board`
- **files**: `src/components/CnUserSettingsDialog/CnUserSettingsDialog.vue`, `src/css/dialog.css`, `src/components/CnAppRoot/CnAppRoot.vue`, `docs/components/cn-app-root.md`
- [x] Implement: the layout, stacked sections, close icon, note under the sections
- [x] Test: `tests/components/CnUserSettingsDialogDqBoard.spec.js` (replaces `CnUserSettingsDialogOneSection.spec.js`)

### Task 2: A board dialog can leave out its header
- **spec_ref**: `openspec/changes/user-settings-dialog-dq-board/specs/user-settings-dialog-dq-board/spec.md#requirement-a-board-dialog-can-leave-out-its-header`
- **files**: `src/components/CnDialog/CnDialog.vue`, `docs/components/cn-dialog.md`
- [x] Implement: `headless`
- [x] Test: `tests/components/CnUserSettingsDialogDqBoard.spec.js`

### Task 3: Redraw the Pt board
- [ ] design-system PR: PqPersoonlijk follows NcAppInstellingen
