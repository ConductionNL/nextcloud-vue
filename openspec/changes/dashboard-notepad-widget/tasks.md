# Tasks: dashboard-notepad-widget

> Row `d-notes` (launchpad). `kind: code`.
> Checkbox budget: 3 tasks x 2 = 6 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: `CnNotepadWidget` and its registration
- **spec_ref**: `openspec/changes/dashboard-notepad-widget/specs/grid-widget-system/spec.md#requirement-a-notepad-widget-is-typed-into-in-place`
- **files**: `src/components/CnNotepadWidget/`, `src/components/CnWidgetGrid/registerDashboardWidgets.js`, `src/components/index.js`, `src/index.js`, `src/schemas/app-manifest-v2.schema.json`, `tests/components/CnNotepadWidget.spec.js`
- **acceptance_criteria**:
  - Editable in view mode; debounced save and save on blur; Saved and not-saved messages
  - Markdown renders when not focused
  - `notepad` is in `listUserAddableWidgetTypes()`
  - Verify: jest with fake timers; `npm run build:validators`
- [ ] Implement
- [ ] Test

### Task 2: Per-person storage
- **spec_ref**: `openspec/changes/dashboard-notepad-widget/specs/grid-widget-system/spec.md#requirement-a-note-belongs-to-the-person-who-wrote-it`
- **files**: `src/components/CnNotepadWidget/CnNotepadWidget.vue`, `tests/components/CnNotepadWidgetStorage.spec.js`
- **acceptance_criteria**:
  - Writes `notepad.<dashboard id>.<widget id>` through `useUserPreferences`; never emits a layout change
  - On focus, a newer stored value replaces the card's text before editing
  - Verify: jest with a fake preferences store; mutation check: writing into `content.text` reddens the layout test
- [ ] Implement
- [ ] Test

### Task 3: Accessibility and docs
- **spec_ref**: `openspec/changes/dashboard-notepad-widget/specs/grid-widget-system/spec.md#requirement-a-user-may-add-a-notepad-to-their-own-dashboard`
- **files**: `tests/a11y/CnNotepadWidget.a11y.spec.js`, `docs/components/cn-notepad-widget.md`, `docs/components/dashboard-widget-catalog.md`
- **acceptance_criteria**:
  - The textarea is labelled by the card title; Saved is announced politely
  - The catalogue lists `notepad` as user-addable
  - Verify: `npm run check:a11y`, `npm run check:docs`, `npm run check:docs-fresh`
- [ ] Implement
- [ ] Test
