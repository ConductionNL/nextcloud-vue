## Why

dossiq's New case dialog opened from a mail reads the case type's questions to
answer them from the mail, then opens the library's form dialog, which reads the
same questions again before the form shows (0.8 s measured, PERF-HANDOFF). The
second read asks the same query and gets the same records.

## What Changes

- `CnFormDialog` takes `preloadedDefinitions`: per driving field, the value the
  caller read definitions for and the records. While the field holds that value
  the form uses them; any other value is read as before.
- `CnActionButtons` forwards an `open-form` entry's `preloadedDefinitions`
  (set at runtime by the caller, never in a manifest).

## Impact

- `src/components/CnFormDialog/CnFormDialog.vue`, `src/components/CnActionButtons/CnActionButtons.vue`.
- Nothing changes for a caller that passes nothing.
