# Proposal: a list edits its rows in its own form

## Why

dossiq's case type page shows its statuses and its fields through two custom widgets, rehosted from the retired admin editor. To make them manifest config over `CnObjectListWidget`, a list must be able to edit a row in its own form and save only what the form changed (the status save must keep `capacity` and the other keys its form does not show). The property form also needs a format select that follows the chosen type.

## What changes

- `CnObjectListWidget` `content.editable`:
  - an Edit row action opens the list's form filled with the row;
  - the save PATCHes only the changed keys, or writes nothing when nothing changed;
  - a refusal shows the server's message;
  - the widget emits `updated`.
- `content.deletable` adds a Delete row action for the list's own schema; the toast offers Undo, and a refusal toasts the server's message.
- An `object-op` patch writes only its values through `patchObject`.
- `optionsFrom` follows another field:
  - `@answer.<key>` tokens, re-read when that field changes;
  - `where` narrows the rows and `itemsPath` reads a list inside each row;
  - `hideWhenEmpty` leaves the field out while the source gives no options.
- Manifest schema 2.135.0.

## Depends on

This builds on `form-small-features` and the branches it holds.
