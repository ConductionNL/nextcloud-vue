# Proposal: action-dialog-acts-and-sources

## Why

Four dialogs on the boards are still hand-built because `CnActionDialog` lacks a few generic options. DqZaakSamenwerken
offers two acts that post to different endpoints, shows some fields for one act only, lists every partner organisation
from the server, and sends the fields a partner does not see as a list of exclusions. DqZaakDialogen "Bekend in een ander
domein" reads its grounds from the server. "In tweeën splitsen" shows the sections a policy allows and ticks each party
as moving or as on both halves, refusing both at once.

## What changes

- `confirm.requestsBy: { field, cases }`: each chosen value posts its own request, with its own button label.
- `visibleWhen` on a field or the note, reading another field's value or a value of the record; a hidden field is not
  required and not sent. `note.textsBy` gives the note's text per chosen value.
- `optionsSource` on a select or checks field: options read from an endpoint, filtered by `match`, optionally searched
  as the reader types, with an error line when the read fails.
- `sendUnticked` and `sendAs`: a checks field can send the items left unticked, under another key.
- `columns` and `exclusive` on a checks field, `hideWhenEmpty`, `requireOneOf`, and `source` for the record.
- A select field takes `default`.

Backward compatible: without the new keys every dialog posts, shows and sends what it did. Covers round 4 items 2 and 4
(CaseSplitDialog, CrossDomainLookupDialog) of the build programme (decision 371).
