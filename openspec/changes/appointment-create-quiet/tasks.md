# Tasks: appointment-create-quiet

### Task 1: The appointment cards' create button can be secondary, with its own icon
- **spec_ref**: `openspec/changes/appointment-create-quiet/specs/appointments/spec.md#requirement-the-appointment-cards-create-button-can-be-secondary-with-its-own-icon`
- **files**: `src/components/CnEventsCard/CnEventsCard.vue`, `src/integrations/builtin/calendar/CnCalendarCard.vue`
- [x] Implement: `createVariant`, `createIcon`
- [x] Test: `tests/components/CnEventsCardHeaderActions.spec.js`, `src/integrations/builtin/calendar/__tests__/CnCalendarCardHeaderActions.spec.js`

### Task 2: A card's flows can sit in its Actions menu
- **spec_ref**: `openspec/changes/appointment-create-quiet/specs/appointments/spec.md#requirement-a-cards-flows-can-sit-in-its-actions-menu`
- **files**: `src/components/CnEventsCard/CnEventsCard.vue`, `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`
- [x] Implement: `content.menuActions`, the host's `menuActions` menu items
- [x] Test: `tests/components/CnEventsCardHeaderActions.spec.js`, `tests/components/CnDetailWidgetHostMenuActions.spec.js`
