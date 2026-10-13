# Tasks: screens-admin-settings-board-header

### Task 1: Path line
- **spec_ref**: `openspec/changes/screens-admin-settings-board-header/specs/settings-board-look/spec.md#requirement-the-admin-settings-header-shows-the-path`
- **files**: `src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue`, `src/css/look-board.css`, `l10n/en.json`, `l10n/nl.json`
- [x] Implement: `breadcrumbs`, `breadcrumbNote`
- [x] Test: `tests/components/CnAdminSettingsShellBoardHeader.spec.js`; e2e `e2e/l8-admin-settings-board-header.e2e.js`

### Task 2: The shell's own board look
- **spec_ref**: `openspec/changes/screens-admin-settings-board-header/specs/settings-board-look/spec.md#requirement-a-shell-told-the-board-look-draws-it-without-a-cnapproot`
- **files**: `src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue`, `src/css/look-board.css`
- [x] Implement: `ownLookClass`, the compound selectors
- [x] Test: same files

### Task 3: Wide lifts the 900px cap
- **spec_ref**: `openspec/changes/screens-admin-settings-board-header/specs/settings-board-look/spec.md#requirement-a-wide-section-is-not-capped-at-900px`
- **files**: `src/css/look-board.css`
- [x] Implement: width and max-width under the board look
- [x] Test: e2e `e2e/l8-admin-settings-board-header.e2e.js` (fails without the change)
