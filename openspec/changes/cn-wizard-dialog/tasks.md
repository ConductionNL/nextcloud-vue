# Tasks: CnWizardDialog + CnRichSubmitDialog

## Phase 1 — CnWizardDialog component

- [x] `src/components/CnWizardDialog/CnWizardDialog.vue` — two-phase dialog (wizard → result).
- [x] Steps via `steps[]` prop; per-step body via `#step-{id}` slot.
- [x] Slot scope: `next`, `back`, `jumpTo`, `submit`, `currentStep`, `stepIndex`, `totalSteps`, `stepData`, `setStepData`, `isFirst`, `isLast`.
- [x] Optional `validate(stepId, stepData) → Promise<boolean|string>` prop.
- [x] Progress indicator with click-to-jump-back (gated by `allowJumpBack`).
- [x] `setResult({success?, message?, error?})` public method; result-phase banner.
- [x] `#result-extra` slot for batch-progress / summary content.
- [x] `@submit`, `@step-change`, `@close` events.
- [x] `src/components/CnWizardDialog/index.js` re-export.

## Phase 2 — CnRichSubmitDialog component

- [x] `src/components/CnRichSubmitDialog/CnRichSubmitDialog.vue` — single-screen rich submit.
- [x] Reason taxonomy (radios) + optional notes textarea + optional file input.
- [x] `maxFiles` / `maxSizeMb` / `filesAccept` constraints with typed validation banners.
- [x] `lateWarning` warning banner when non-empty.
- [x] `isValid` computed gates the Submit button per the required flags.
- [x] `setResult({success?, message?, error?})` public method.
- [x] `@confirm({reason, notes, files})`, `@close` events.
- [x] `src/components/CnRichSubmitDialog/index.js` re-export.

## Phase 3 — Barrels + baselines

- [x] `src/components/index.js` — both components.
- [x] `src/index.js` — both components.
- [x] `scripts/.jsdoc-baselines.json` — `CnWizardDialog: 1`, `CnRichSubmitDialog: 1`.

## Phase 4 — Tests

- [x] `tests/components/CnWizardDialog.spec.js` — 16 cases.
- [x] `tests/components/CnRichSubmitDialog.spec.js` — 14 cases.

## Phase 5 — Docs

- [x] `docs/components/cn-wizard-dialog.md` — try-it, slot scope, props, events, methods.
- [x] `docs/components/cn-rich-submit-dialog.md` — try-it, props, events, file-input semantics.
- [x] Cross-links from `CnFormDialog`, `CnExportWizard` (in their own docs — follow-up if needed).

## Phase 6 — Consumer migrations (out of scope for this PR)

- [~] pipelinq: `ContactmomentForm` / `TaskForm` → `CnWizardDialog` instances (tracked separately). — deferred to downstream cycle / fleet-wide adoption (handoff)
- [~] scholiq: `BulkEnrolModal` / `ImportQtiModal` → `CnWizardDialog`; `SubmitWorkModal` / `SubmitExcuseModal` → `CnRichSubmitDialog`. — deferred to downstream cycle / fleet-wide adoption (handoff)
