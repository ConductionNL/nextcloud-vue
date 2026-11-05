# Proposal: action-dialog-share-look-and-outcome

## Why

dossiq's share dialog (board DqZaakSamenwerken) can now post per act, hide fields per act and read its partners from the
server, but moving it onto `CnActionDialog` would still change what the user sees and what happens after the act. The
board draws Share and Hand over as two rows side by side without a label, a plain "share only some case fields" checkbox
and its parts 16px apart. After the act the dialog closes and a toast names the organisation the case went to, and a
failure the server does not word says "The case could not be shared.".

## What changes

- A cards field passes `layout`, `columns` and `hideLabel` to `CnChoiceCards`.
- A checkbox field takes `look: 'plain'`: a plain checkbox and label, without the tinted box.
- `gap` sets the room between the dialog's parts in px.
- `closeOnDone: true` says the done text as a toast and closes the dialog.
- The done text and a body read `{fields.<key>}`, `{chosen.<field>.<path>}` (the entry an `optionsSource` gave for the
  chosen option) and `{objectId}`.
- `errorText` on the request or on `confirm` words a failure the server gives no message for.

Backward compatible: without the new keys every dialog draws, sends and ends as it did. Serves round 4 item 2 of the
build programme (decision 371).
