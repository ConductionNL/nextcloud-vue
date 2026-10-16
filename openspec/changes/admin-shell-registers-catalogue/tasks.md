# Tasks: admin-shell-registers-catalogue

### Task 1: An admin page reads in the user's language without the app registering
- **spec_ref**: `openspec/changes/admin-shell-registers-catalogue/specs/settings-board-look/spec.md#requirement-an-admin-page-reads-in-the-users-language-without-the-app-registering`
- **files**: `src/l10n/index.js`, `src/components/CnAdminSettingsShell/CnAdminSettingsShell.vue`, `src/components/CnVersionInfoCard/CnVersionInfoCard.vue`
- [x] Implement: `ensureTranslations()`, called from both components' `setup()`
- [x] Test: `tests/l10n/adminShellRegistersCatalogue.spec.js`
