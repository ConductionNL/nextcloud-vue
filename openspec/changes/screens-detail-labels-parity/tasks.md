# Tasks: screens-detail-labels-parity

## Implementation Tasks

### Task 1: Detail labels read in the user's language
- **spec_ref**: `openspec/changes/screens-detail-labels-parity/specs/detail-labels-board-look/spec.md#requirement-detail-labels-read-in-the-users-language`
- **files**: `src/components/CnTabsWidget/CnTabsWidget.vue`, `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`, `l10n/nl.json`, `l10n/en.json`
- [x] Implement: `tabLabel()` through `cnTranslate`; integration title through `translateLabel()`; catalogue entries; History reads Historie
- [x] Test: authored label, child title, untranslated label, board History tab (`tests/components/CnDetailLabelsBoardLook.spec.js`)

### Task 2: A side card takes its manifest title
- **spec_ref**: `openspec/changes/screens-detail-labels-parity/specs/detail-labels-board-look/spec.md#requirement-a-side-card-takes-its-manifest-title`
- **files**: `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`
- [x] Implement: `cardTitle` in `rendererProps` under the board look
- [x] Test: manifest title, translated title, untitled activity, content.title wins, no board look, bare panel, renderer without a title prop (`tests/components/CnDetailLabelsBoardLook.spec.js`)

### Task 3: Live check
- [ ] Read DqZaak and PtAccount on :8080 after a release (not run: the apps run the released package)
