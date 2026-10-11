# Tasks: screens-stage-dates-source

## Implementation Tasks

### Task 1: The reached dates can come from their own endpoint
- **spec_ref**: `openspec/changes/screens-stage-dates-source/specs/stage-dates-source/spec.md#requirement-the-reached-dates-can-come-from-their-own-endpoint`
- **files**: `src/components/CnStagesWidget/CnStagesWidget.vue`, `e2e/harness/StagesHarness.vue`, `e2e/stages-dates-source.e2e.js`, `tests/components/CnStagesWidgetDatesSource.spec.js`
- [x] Implement: `datesSource` read through `useEndpointSource`, `stageDates` merged into `barStages`
- [x] Test: unit (merge by id with path and fields, defaults and list response, fallback on failure, no board look, nothing without the option) and harness e2e (board short dates, since, one request; control without the option)

### Task 2: Live check
- [ ] DqZaak on :8080 (not run: needs a release and dossiq to set `datesSource`)
