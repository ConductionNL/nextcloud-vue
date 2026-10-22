## Why

Two pipelinq sections were field lists with one thing the widget lacked. The dossier a resident asked about lists documents that link to their public publication, under a line naming the dossier. The contact channels list asks Nextcloud Contacts to take the change after each save.

## What changes

- `row.href`: the row title links to a safe href (http(s) or root-relative; absolute opens in a new tab).
- `lead`: a line above the rows, filled from the object.
- `afterSave`: an endpoint called after every save that went through; a failure keeps the save and shows `failureText`.

## Impact

No schema change. First consumer: pipelinq (PL-ABSTRACT lane PL1).
