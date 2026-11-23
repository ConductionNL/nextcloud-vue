# Proposal: dialog-dedup-extensions

## Why

Apps copy the same dialogs file by file: a confirm with one extra checkbox, a mass publish or lock that repeats the mass delete, a footer with cancel and a saving primary button, a tree whose rows need an icon beside the label. Each copy counts as duplicated code. The shared components almost fit; four small additions let the apps use them as they are.

## What changes

- CnConfirmDialog gets a default slot below the message, for a checkbox, a list or a note.
- New CnMassActionDialog: CnMassDeleteDialog with `variant`, `confirmIcon` and a board `sentence`, for any action on many items. CnMassDeleteDialog becomes that dialog with the delete defaults, under its own name and test ids.
- New CnDialogActions: the cancel and primary footer of a hand-built dialog, with a loading icon while saving. It comes from filinq's FormDialogActions.
- CnTreeView gets a `#label` slot with scope `{ node, depth, expanded }`.
- Nothing changes for a consumer that passes none of the new props or slots. tests/components/DialogDedupUnchangedShape.spec.js pins today's render of every state, recorded before the change.
- New strings in en and nl.
