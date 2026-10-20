# Tasks: pill-color-field

### Task 1: A pill takes its tone and icon from the referenced record
- **spec_ref**: `openspec/changes/pill-color-field/specs/pill-color-field/spec.md#requirement-a-pill-takes-its-tone-and-icon-from-the-referenced-record`
- **files**: `src/utils/headerFieldChips.js`, `src/utils/detailActionModel.js`, `src/composables/useRefLabels.js`, `src/components/CnDetailPage/CnDetailPage.vue`
- [x] Implement: NL DS hues in `variantForColor`, `pillLook`, strict field resolve, header pills read colour and icon
- [x] Test: `tests/utils/pillColorField.spec.js`, `tests/composables/useRefLabels.spec.js`

### Task 2: A badge cell takes its tone and icon from the referenced record
- **spec_ref**: `openspec/changes/pill-color-field/specs/pill-color-field/spec.md#requirement-a-badge-cell-takes-its-tone-and-icon-from-the-referenced-record`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnCellRenderer/CnCellRenderer.vue`
- [x] Implement: `refLookSpecs`, `loadRefLooks`, `widgetProps.looks` on the badge widget
- [x] Test: `tests/components/CnCellRendererBadgeLook.spec.js`

### Task 3: A saved view's icon shows in the My views menu
- **spec_ref**: `openspec/changes/pill-color-field/specs/pill-color-field/spec.md#requirement-a-saved-view-s-icon-shows-in-the-my-views-menu`
- **files**: `src/utils/savedViewMenu.js`, `src/components/CnIndexPage/CnIndexPage.vue`
- [x] Implement: entries keep and sync `icon`; the menu shows it
- [x] Test: `tests/utils/pillColorField.spec.js`
