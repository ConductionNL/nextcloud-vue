# Tasks: app-shown-name-in-chrome

### Task 1: The localised name
- **spec_ref**: `openspec/changes/app-shown-name-in-chrome/specs/app-root/spec.md#requirement-the-app-chrome-shows-the-apps-localised-name`
- **files**: `src/components/CnAppRoot/CnAppRoot.vue`
- [x] Implement: `shownAppName` for the dialog, the setup wizard and the credentials section
- [x] Test: `tests/components/CnAppRootShownAppName.spec.js`

### Task 2: No underline
- **spec_ref**: `openspec/changes/app-shown-name-in-chrome/specs/app-root/spec.md#requirement-the-user-settings-navigation-is-not-underlined`
- **files**: `src/components/CnUserSettingsDialog/CnUserSettingsDialog.vue`
- [x] Implement: `text-decoration: none !important` on the nav links
- [x] Test: `tests/css/userSettingsNavLinks.spec.js`
