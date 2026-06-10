# Tasks: CnExportWizard

## Phase 1 — Component

- [x] Create `src/components/CnExportWizard/CnExportWizard.vue` (template + script + scoped styles).
- [x] Two-phase dialog: form (scope/format/delivery fields) → result (success / error / jobId).
- [x] Scope pickers: `date-range`, `regulation`, `schema` — rendered per `scopes` prop.
- [x] Regulation field: select when `regulations[]` non-empty; free-form text otherwise.
- [x] Delivery select with email-recipient reveal when `delivery === 'email'`.
- [x] Loading lifecycle: `onConfirm` flips loading on, `setResult` flips it off.
- [x] `onClose` resets local state and emits `@close`.
- [x] JSDoc on every prop, event, method, and computed (100% baseline).

## Phase 2 — Barrel + indexing

- [x] `src/components/CnExportWizard/index.js` re-export.
- [x] `src/components/index.js` named export.
- [x] `src/index.js` named export (alphabetised next to `CnMassExportDialog` / `CnMassImportDialog`).
- [x] `scripts/.jsdoc-baselines.json` — add `"CnExportWizard": 1`.

## Phase 3 — Tests

- [x] `tests/components/CnExportWizard.spec.js` covering:
  - form phase renders by default; result phase renders after `setResult`.
  - date-range / regulation (select) / regulation (free-form) / schema scopes render per `scopes`.
  - email recipient reveal on `delivery === 'email'`.
  - `@confirm` emits with the current form data + `defaults` merge.
  - `loading` flips during the confirm → setResult cycle.
  - success banner shows jobId + message; error banner shows error.
  - `@close` resets internal state.
  - `fieldLabels` overrides built-in labels.

## Phase 4 — Docs

- [x] `docs/components/cn-export-wizard.md` — try-it example, props/events/methods, result-phase shape, polling pattern recipe.
- [x] Cross-link to `CnFormDialog`, `CnMassExportDialog`.

## Phase 5 — Consumer follow-up (out of scope for this PR)

- [~] Open scholiq PR replacing `AuditPackExportModal` + `RequestExportModal` with `CnExportWizard` instances. Tracked separately once this lands. [DEFERRED — consumer-repo migration, explicitly "out of scope for this PR" per Phase 5 heading.]
