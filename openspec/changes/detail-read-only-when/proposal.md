# Proposal: detail-read-only-when

## Why

A record can be closed to edits for a reason that is not a right. A contact merged into another stays readable, so
links to it keep working, but its page should not offer Edit: the surviving record is where changes go. A detail page
turns its edit controls off only when OpenRegister reports `can.update` false, so the merged record still shows Edit.

## What changes

- CnDetailPage takes `readOnlyWhen` (manifest `config.readOnlyWhen`), a condition in the `visibleWhen` grammar.
- While it holds for the record, the page acts as with `can.update` false: no Edit button, no header actions with role
  `edit` or `update`, and the inline editors are off.
- Without the option nothing changes. `can.update` false still withdraws the controls as before.

No schema change: the page config is open. The server keeps refusing what it refuses; this only stops offering the
controls.
