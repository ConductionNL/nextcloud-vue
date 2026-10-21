---
kind: code
---

# Proposal: action-dialog-secret-field

## Summary

CnActionDialog asked for empty fields only, so it could not edit a record, and it had no input for a value that must never come back to the browser. pipelinq's POS staff form (name, linked user, role, a PIN the server hashes) is the first consumer.

- A field's `valuePath` starts it from the record (the summary source or the `object` prop).
- A `secret` field is a password input with `autocomplete="new-password"`. It never shows a stored value. While its `storedPath` reads true on the record, it says "Stored. Type a new value to replace it.", it is not required, and it is sent only when something was typed.

Nothing changes for a dialog that uses neither.

## Scope

- `src/components/CnActionDialog/CnActionDialog.vue`, `docs/components/cn-action-dialog.md`, `tests/components/CnActionDialogSecret.spec.js`.
