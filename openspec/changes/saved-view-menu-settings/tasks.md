# Tasks: saved-view-menu-settings

### Task 1: A user orders and picks the views in their menu
- **spec_ref**: `openspec/changes/saved-view-menu-settings/specs/saved-view-menu-settings/spec.md#requirement-a-user-orders-and-picks-the-views-in-their-menu`
- **files**: `src/components/CnSavedViewMenuSettings/`, `src/components/CnOrderedListField/CnOrderedListField.vue`, `l10n/en.json`, `l10n/nl.json`
- [x] Implement: the section body over the menu holder; `removeLabel` and `addHint` on CnOrderedListField
- [x] Test: `tests/components/CnSavedViewMenuSettings.spec.js`

### Task 2: The user settings dialog offers the views in my menu
- **spec_ref**: `openspec/changes/saved-view-menu-settings/specs/saved-view-menu-settings/spec.md#requirement-the-user-settings-dialog-offers-the-views-in-my-menu`
- **files**: `src/components/CnAppRoot/CnAppRoot.vue`
- [x] Implement: the `views` key and section, the holder's `set`
- [x] Test: `tests/components/CnAppRoot.savedViewMenuSection.spec.js`
