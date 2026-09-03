# Tasks: CnDetailPage form-dialog slot

## Phase 1 — the slot

- [x] Wrap `CnDetailPage`'s two `CnFormDialog` children (create archetype +
      record edit) in a single `<slot name="form-dialog">`, leaving both
      children and their `v-if` conditions and `@confirm` / `@close` bindings
      byte-identical as the slot's fallback content.
      `files_likely_affected`: `src/components/CnDetailPage/CnDetailPage.vue`
      `spec_ref`: "MUST expose a `form-dialog` scoped slot", "the default path
      MUST be unchanged"
- [x] Add a `formDialogVisible` computed mirroring the two `v-if` conditions
      exactly, including the `editFormAwaitingRecord` guard (#850).
      `spec_ref`: "`show` MUST mirror the built-in dialogs' visibility conditions"
- [x] Add a `formDialogItem` computed: `createPrefill` in create mode, the
      loaded record otherwise.
      `spec_ref`: "the slot covers both built-in dialogs"
- [x] Bind `show` / `item` / `schema` / `confirm` / `close` into the slot
      scope, with `show` and `confirm` as props.
      `spec_ref`: "`show` and `confirm` MUST be bound as props"

## Phase 2 — the save path

- [x] Add `onFormDialogConfirm` dispatching on `isCreateMode` to
      `onCreateFormConfirm` / `onEditFormConfirm`.
      `spec_ref`: "`confirm` MUST run the page's own persistence path"
- [x] Add `onFormDialogClose` dispatching to `onCreateFormClose` /
      `closeEditForm`, so a dismissed create still navigates back.
- [x] Give `onCreateFormConfirm` and `onEditFormConfirm` return values
      (`{ success, data }` / `{ error }`) covering every exit, without changing
      any existing side effect. Nothing on the default path reads them.
      `spec_ref`: "`confirm` MUST resolve to the save outcome"

## Phase 3 — tests

- [x] `tests/components/CnDetailPageFormDialogSlot.spec.js` with
      `@vue/test-utils`, covering: the default path unchanged (fallback renders,
      untransformed store schema, the awaiting-record guard); the override
      receiving the index-page scope, mounted the way `CnPageRenderer` mounts a
      manifest slot (props spread, no listeners); the save routing through the
      page's own path; the resolved result on success and failure; create mode
      through the same slot; and a transform reaching the rendered form, with a
      negative control.
- [x] Confirm the 24 existing `CnDetailPage*` suites still pass unchanged.

## Phase 4 — docs

- [x] Add the `form-dialog` row to the Slots table in
      `src/components/CnDetailPage/CnDetailPage.md`.
- [x] Add a "Replacing the form dialog" section showing the decidiq-shaped use:
      fetch a vocabulary, splice it into an enum, return a copy, and hand
      `confirm`'s result to the dialog's `setResult`.
- [x] Regenerate `docs/components/_generated/CnDetailPage.md`
      (`check:docs-fresh`).
