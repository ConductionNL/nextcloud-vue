# A files browser host action can be offered by a field of the file's row

## Why

dossiq's "Who can see this" card (board DqDocumentenBeheer) offers "Change exception" on a document. Only someone
who may change the case may change who sees a document, and the server refuses everyone else (dossiq
document-access-exception). The button should not be offered to them either. The host already gives the browser a
row per file (`rowData`), and the row can say whether this caller may change it; what is missing is a way to offer
an action by that row.

## What changes

- `visibleIf.row` on a host action: a map of row fields to the value each must have, compared strictly. Every
  condition named must hold, as with `extension` and `mime`. A file without a row, or a host without `rowData`,
  does not meet a `row` condition.
- Side card actions honour `visibleIf` too (extension, mime and row), as row actions already did.

## What does not change

- An action without `visibleIf` is offered as before. Hiding is an affordance; the host's endpoint still decides.
