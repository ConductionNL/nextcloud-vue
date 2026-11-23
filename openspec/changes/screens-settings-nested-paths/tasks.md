# Tasks: screens-settings-nested-paths

### Task 1: Nested paths
- **spec_ref**: `openspec/changes/screens-settings-nested-paths/specs/settings-widgets/spec.md#requirement-a-settings-widget-writes-a-nested-field-as-its-enclosing-top-level-object`
- **files**: `src/utils/objectWrite.js`, the five settings widgets
- [x] Implement: `writeFields`, the widgets read the answer by path
- [x] Test: `tests/utils/objectWrite.spec.js`, `tests/components/CnRadioCardsWidget.spec.js`; e2e `e2e/l7-nested-settings.e2e.js`

### Task 3: Chips minimum, form default, chips in the form
- **spec_ref**: `openspec/changes/screens-settings-nested-paths/specs/settings-widgets/spec.md#requirement-a-chips-field-belongs-to-the-settings-forms-one-save`
- [x] Implement: `minItems`/`required`, `default`, field type `chips` (chips widget `modelValue` mode)
- [x] Test: `tests/components/CnChipsFieldWidget.spec.js`, `tests/components/CnSettingsFormWidget.spec.js`, e2e

### Task 2: Save endpoint
- **spec_ref**: `openspec/changes/screens-settings-nested-paths/specs/settings-widgets/spec.md#requirement-a-settings-widget-can-write-through-an-app-endpoint`
- [x] Implement: `content.save` on every settings widget
- [x] Test: unit specs and e2e
