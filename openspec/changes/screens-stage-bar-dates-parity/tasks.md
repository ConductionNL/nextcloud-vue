# Tasks: screens-stage-bar-dates-parity

## Implementation Tasks

### Task 1: A bar date reads as the board draws it
- **spec_ref**: `openspec/changes/screens-stage-bar-dates-parity/specs/stage-bar-dates/spec.md#requirement-a-bar-date-reads-as-the-board-draws-it`
- **files**: `src/components/CnStagesWidget/CnStagesWidget.vue`, `l10n/nl.json`, `l10n/en.json`
- [x] Implement: `barDate()` with `formatBoardDate` and `since {date}` under the board look
- [x] Test: short form, since on the current step, text as written, no board look (`tests/components/CnStagesWidgetBarDates.spec.js`)

### Task 2: Live check
- [ ] DqZaak on :8080 (not run: needs a release and the reached dates from the dossiq endpoint)
