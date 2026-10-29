# A record list's footer can be one row with a lead and a prompt from the answer

## Why
DqZaak Zaakplan ends with one ruled row: "**Doelen** nog geen doelen: wat wil de verzoeker dat er verandert?" and
"+ Doel toevoegen" at its end. The prompt differs per case type, so it comes from the answer the list reads
(dossiq `GET /api/cases/{id}/goals` answers `{ results, prompt }`). The footer could only stack a fixed note above a
button.

## What changes
- `footerAction.layout: "row"` puts the note and the action in one row with a hairline above it, the action at its end.
- `footerAction.note` may be `{ path, lead }`: `lead` is a bold label before the note (translated), and the note is the
  value at `path` of the list's own answer (one request, through the endpoint cache), translated, shown while the list
  has no rows. A string note is unchanged.
No schema change.
