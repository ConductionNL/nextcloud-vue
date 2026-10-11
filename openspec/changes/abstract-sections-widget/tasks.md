# Tasks: abstract-sections-widget

## Implementation Tasks

### Task 1: The widget
- **spec_ref**: `openspec/changes/abstract-sections-widget/specs/sections-widget/spec.md#requirement-a-sections-widget-stacks-configured-widgets-under-headings`
- **files**: `src/components/CnSectionsWidget/CnSectionsWidget.vue`, `src/components/CnSectionsWidget/index.js`
- [x] Implement: inline and by-id sections, headings, rule, `fit: false`, translate, aria-labelledby
- [x] Test: `tests/components/CnSectionsWidget.spec.js`

### Task 2: Empty sections
- **spec_ref**: `openspec/changes/abstract-sections-widget/specs/sections-widget/spec.md#requirement-a-section-whose-widget-draws-nothing-stays-silent`
- [x] Implement: MutationObserver measure, `display: none` with the host mounted, `hideEmpty`
- [x] Test: unit spec + `e2e/sections-widget.e2e.js` (no space, no rule)

### Task 3: Cards and columns
- **spec_ref**: `openspec/changes/abstract-sections-widget/specs/sections-widget/spec.md#requirement-a-sections-widget-can-draw-cards-in-a-main-and-a-side-column`
- [x] Implement: `cards`, `column: "side"`, two-column grid
- [x] Test: unit spec + e2e (side column 20px right, top-aligned, cards 20px apart)

### Task 4: Tabs pass siblings
- **spec_ref**: `openspec/changes/abstract-sections-widget/specs/sections-widget/spec.md#requirement-a-tab-panel-passes-its-siblings-on`
- **files**: `src/components/CnTabsWidget/CnTabsWidget.vue`
- [x] Implement: `:availableWidgets` on the panel host
- [x] Test: existing CnTabsWidget suites green; unit spec asserts the sections widget forwards siblings

### Task 5: Registration and docs
- **files**: `src/utils/libraryWidgetKeys.js`, `src/components/CnWidgetGrid/registerDashboardWidgets.js`, `src/components/index.js`, `src/index.js`, `docs/components/cn-sections-widget.md`
- [x] Catalog registration (container), exports, docs page
