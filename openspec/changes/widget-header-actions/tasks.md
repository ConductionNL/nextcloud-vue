# Tasks: widget-header-actions

### Task 1: A widget declares buttons for its card header
- **spec_ref**: `openspec/changes/widget-header-actions/specs/widget-header-actions/spec.md#requirement-a-widget-declares-buttons-for-its-card-header`
- **files**: `src/utils/widgetHeaderActions.js`, `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`
- [x] Implement: `resolveWidgetHeaderActions`, the host's provide
- [x] Test: `tests/utils/widgetHeaderActions.spec.js`

### Task 2: The card that titles a widget draws its header actions
- **spec_ref**: `openspec/changes/widget-header-actions/specs/widget-header-actions/spec.md#requirement-the-card-that-titles-a-widget-draws-its-header-actions`
- **files**: `src/components/CnWidgetWrapper/CnWidgetWrapper.vue`, `src/components/CnWidgetWrapper/CnWidgetHeaderActionButtons.vue`, `src/components/CnDetailCard/CnDetailCard.vue`, `src/components/CnTabsWidget/CnTabsWidget.vue`, `docs/components/cn-widget-wrapper.md`, `docs/components/cn-tabs-widget.md`
- [x] Implement: the buttons in the title row, outermost card only; the bare panel heading
- [x] Test: `tests/components/CnWidgetHeaderActions.spec.js`
