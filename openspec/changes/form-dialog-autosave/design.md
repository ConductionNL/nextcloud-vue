# Design: form dialog autosave

## Component and surface

- `CnFormDialog` (`src/components/CnFormDialog/`) and `CnFormPage` share a new
  `useFormDraft` composable (`src/composables/useFormDraft.js`, Options API
  mixin form as the library requires).
- `dialog-system` capability, new REQ-DG-016.

Kind: code.

## Two layers

**Layer 1, local recovery.** Every keystroke debounced at 500 ms writes the
form values to `localStorage` under
`cn-form-draft:{appId}:{schema}:{objectId|new}:{userId}`. On open with a stored
draft newer than the object's `updated`, the dialog shows a bar: "You have
unsaved changes from {relative time}" with Restore and Discard. A successful
save or an explicit Discard clears the key. Drafts older than 7 days are
dropped on read.

**Layer 2, server draft.** With `allowDraft: true` the footer gains "Save
draft". It skips client-side validation except type checks, sets
`draftField` to `true` on the payload and saves through the existing store
path. The dialog closes and emits `draft-saved` with the object. Opening a
draft object shows "Draft" in the title and a "Publish" button that runs full
validation and sets `draftField` to `false`.

## Indicator

A footer text "Saved {time}" after each local write, "Saving" while writing.
Rendered with `aria-live="polite"`, one announcement per state change.

## Interaction with existing requirements

- REQ-DG-006 validation still gates Save and Publish. Save draft is the only
  path around it, and it is explicit.
- REQ-DG-015: the recovery bar sits inside the dialog's focus trap.
- Multi-tenant: the key includes the user id so a shared browser profile does
  not leak a draft between users.

## Alternatives considered

- Server autosave on every keystroke: rejected, it writes audit rows for
  half-typed values.
- Session storage only: rejected, a closed tab is the case this solves.
