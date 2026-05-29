# CnWizardDialog + CnRichSubmitDialog — multi-step wizard and rich submit modal

## Why

The pipelinq + scholiq triage flagged 7 customs as the highest-leverage cluster pending lib support for two related modal shapes:

| Custom | Lib gap |
|--------|---------|
| pipelinq `ContactmomentForm`, `TaskForm` | Multi-step wizard with per-step validation + dynamic channel-driven fields |
| scholiq `BulkEnrolModal` | Multi-step wizard (audience → resource → confirm + batch progress) |
| scholiq `ImportQtiModal` | Multi-step wizard (file upload → parse → preview → commit) |
| scholiq `SubmitWorkModal`, `SubmitExcuseModal` | Single-step rich submit (reason taxonomy + file upload + late-submission rules) |
| scholiq `SignPlanModal` | (Related — signature step; tracked separately as `CnSignatureCapture` #282) |

`CnFormDialog` is single-step + schema-driven. Neither shape composes cleanly without significant per-app scaffolding.

## What changes

1. **CnWizardDialog** — Two-phase modal (wizard → result). Steps declared via `steps[]` prop; per-step body rendered via `#step-{id}` slot with the navigation API exposed in the slot scope (`next`, `back`, `jumpTo`, `submit`, `currentStep`, `stepIndex`, `totalSteps`, `stepData`, `setStepData`, `isFirst`, `isLast`). Optional per-step `validate` prop returns `true | string | false`. Progress indicator at the top with click-to-jump-back when `allowJumpBack`. Public `setResult({success?, message?, error?})` method enters the result phase.
2. **CnRichSubmitDialog** — Single-screen modal with reason taxonomy (`reasons[]`), free-text notes (`showNotes`), file attachments (`showFiles` + `maxFiles` + `maxSizeMb` + `filesAccept`), and an optional `lateWarning` banner. Per-field required flags drive an `isValid` computed that gates the Submit button. Emits `@confirm({reason, notes, files})`.
3. **Barrel exports** for both components.
4. **jsdoc-baselines** updated (`CnWizardDialog: 1`, `CnRichSubmitDialog: 1`).
5. **Tests** — 16 cases for the wizard (step navigation, validation, jump-to, submit, result phase, close-reset) + 14 cases for the rich-submit dialog (reason / notes / files validation, file constraints, late-warning, result phase, close-reset).
6. **Docs pages** for both components with try-it examples, prop/event/method tables, and cross-links.

## Non-goals

- Signature capture — lives in [`CnSignatureCapture` #282](https://codeberg.org/Conduction/nextcloud-vue/issues/282), a separate component used inside one of the wizard's slots.
- Async-batch progress polling — consumer-side. The wizard exposes `setResult({jobId})` and a `#result-extra` slot so consumers can drop a progress widget into the result phase.
- Field-schema integration in CnRichSubmitDialog — that path stays on `CnFormDialog`.

## Consumer impact

Refs [#281](https://codeberg.org/Conduction/nextcloud-vue/issues/281). Unblocks 7 customs across pipelinq + scholiq once consumer-side flips land in follow-up PRs.

## References

- [pipelinq#415](https://codeberg.org/Conduction/pipelinq/pulls/415), [scholiq#131](https://codeberg.org/Conduction/scholiq/pulls/131) — consuming-app PRs documenting the lib gap.
- `CnFormDialog`, `CnAdvancedFormDialog` — single-step relatives.
- `CnExportWizard` (#283 / PR #299) — adjacent pre-built wizard for the export shape.
