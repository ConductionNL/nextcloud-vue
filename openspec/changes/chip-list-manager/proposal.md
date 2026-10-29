# Proposal: chip-list-manager

## Why

Board PqBeheerMarketing (pipelinq) draws a Labels card: the labels as chips with a delete cross, a "Nieuw label" field with Toevoegen, and the line "Dubbelklik op een label om het te hernoemen." Pipelinq keeps those labels as objects of a `label` schema (openspec shared-label-list in pipelinq). No library component manages a list of words kept in a schema; CnChipsFieldWidget edits a field on one record.

## What changes

- New CnChipListManager: an admin card over an OpenRegister schema, one object per word. It lists the words as chips, adds one, renames one on double-click or F2, and deletes one after a CnConfirmDialog.
- A rename goes to `renameUrl` when given, so an app can rewrite the word where it is used. Without it the object is updated.
- A name already on the list, in any case, is refused in the card. A refused write (403, 409) or a failed one shows as a line in the card.
- New strings in en and nl. No schema change.
