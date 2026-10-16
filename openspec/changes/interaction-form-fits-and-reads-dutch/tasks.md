# Tasks: interaction-form-fits-and-reads-dutch

### Task 1: Fit the card and read Dutch
- **spec_ref**: `openspec/changes/interaction-form-fits-and-reads-dutch/specs/interaction-form-widget/spec.md#requirement-the-interaction-form-fits-its-card-and-reads-in-the-readers-language`
- **files**: `src/css/form-widget.css`, `src/components/CnInteractionFormWidget/CnInteractionFormWidget.vue`, `l10n/nl.json`, `l10n/en.json`
- [x] Implement: select width in form widgets, `copy()` for manifest labels, catalogue entries
- [x] Test: `tests/l10n/interactionFormDutch.spec.js`; e2e `e2e/l11-contact-form-fit.e2e.js`

### Task 2: The submit label on a dashboard
- **spec_ref**: `openspec/changes/interaction-form-fits-and-reads-dutch/specs/interaction-form-widget/spec.md#requirement-the-interaction-form-fits-its-card-and-reads-in-the-readers-language`
- **files**: `src/components/CnInteractionFormWidget/CnInteractionFormWidget.vue`
- [x] Implement: the widget's attributes skip the names its form takes as props, so a dashboard's `submitLabel` attribute no longer replaces the translated label
- [x] Test: `tests/components/CnInteractionFormWidgetOnDashboard.spec.js`; e2e `e2e/l22-interaction-form-dashboard-label.e2e.js`
