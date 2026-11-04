# Tasks: duration-field-timer

### Task 1: A duration field can run as a clock
- **spec_ref**: `openspec/changes/duration-field-timer/specs/duration-field-timer/spec.md#requirement-a-duration-field-can-run-as-a-clock`
- **files**: `src/components/CnDurationField/CnDurationField.vue`, `src/utils/isoDuration.js`, `src/components/CnFormDialog/CnFormDialog.vue`, `docs/components/cn-duration-field.md`, `docs/components/cn-form-dialog.md`, `l10n/en.json`, `l10n/nl.json`
- [x] Implement: `timer`, Start, Stop, Reset
- [x] Test: `tests/components/CnDurationFieldTimer.spec.js`

### Task 2: A user can type over the clock
- **spec_ref**: `openspec/changes/duration-field-timer/specs/duration-field-timer/spec.md#requirement-a-user-can-type-over-the-clock`
- **files**: `src/components/CnDurationField/CnDurationField.vue`, `src/utils/isoDuration.js`
- [x] Implement: `parseClock`, typing stops the clock
- [x] Test: `tests/components/CnDurationFieldTimer.spec.js`

### Task 3: A clock can start by itself on an empty field
- **spec_ref**: `openspec/changes/duration-field-timer/specs/duration-field-timer/spec.md#requirement-a-clock-can-start-by-itself-on-an-empty-field`
- **files**: `src/components/CnDurationField/CnDurationField.vue`
- [x] Implement: `autoStart`
- [x] Test: `tests/components/CnDurationFieldTimer.spec.js`

### Task 4: A clock can show the time against a norm
- **spec_ref**: `openspec/changes/duration-field-timer/specs/duration-field-timer/spec.md#requirement-a-clock-can-show-the-time-against-a-norm`
- **files**: `src/components/CnDurationField/CnDurationField.vue`
- [x] Implement: `norm`, `normWarningPercent`, `normLabel`
- [x] Test: `tests/components/CnDurationFieldTimer.spec.js`
