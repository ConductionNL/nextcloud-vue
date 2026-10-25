# An object list column can wrap its text

## Why

DqZaakContact's contact moments wrap the summary onto a second line ("Vult
het verzoek aan met de offertes voor de lantaarnpalen."); live cut it off with
an ellipsis. CnDataTable already wraps a column with `cellClass:
"cn-cell--wrap"`, but CnObjectListWidget dropped `cellClass` from a manifest
column, so a list could not ask for it.

## What changes

CnObjectListWidget passes a column's `cellClass` to the table.
