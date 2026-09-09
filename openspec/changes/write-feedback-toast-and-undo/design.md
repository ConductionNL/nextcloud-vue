# Design: write feedback, toast and undo

## Components and helper

- `src/composables/useWriteFeedback.js`: `success(message, { undo })`,
  `error(message)`, `confirm(message)`. `success` with `undo` calls
  `showUndo` from `@nextcloud/dialogs` with a 10 s window and runs the
  callback on click. `confirm` resolves through the existing two-phase dialog
  pattern (REQ-DG-001) with a small `CnConfirmDialog` in `src/dialogs/`.
- `CnFormDialog`: after a successful save, `success(t('Saved {title}'))`;
  on failure, `error` with the server message beside the inline error that
  already renders.
- `CnLifecycleActions`: before a transition with `variant: danger`, into a
  final state, or with `confirm: true`, open the confirm dialog. After a
  successful POST, `success` with an Undo when the graph declares a reverse
  transition from the new state back to the old one.
- `CnObjectListWidget`: after its create dialog resolves, `success`; after a
  row delete, `success` with Undo that restores from the OpenRegister trash
  endpoint the store already exposes.

Kind: code.

## Messages

Toasts name the object where the schema declares a title field: "Saved
Permit 2026-00012", "Moved Permit 2026-00012 to In review". Otherwise the
schema title: "Saved case". Every string goes through `t()`; Dutch lands in
`nl.json`.

## Opt-out

`feedback: false` on the `CnFormDialog` prop, the `lifecycleActions` config or
the widget `content` disables the toast for that surface. The confirm stays
unless `confirm: false` is set on the transition.

## What undo does not do

Undo is not offered for a save; the version history (`manifest-edit-history`)
is the way back there. Undo is not offered for a transition without a reverse
edge; the toast then reads without a button. The library never guesses a
reverse path.

## Alternatives considered

- Feedback in each app's `main.js` through store subscriptions: rejected,
  the message would not know which dialog closed.
- A single global store listener in the library: rejected for the same
  reason, and it would double-toast apps that already show one.
