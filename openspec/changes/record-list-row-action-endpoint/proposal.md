# Proposal: record-list-row-action-endpoint

## Why

DqZaakBesluiten ends an open advice request with "Herinneren", a button that sends the advisor a reminder through
dossiq's own endpoint, and the received ones with nothing. A record list's one row action (`rowAction`) could open a
page, navigate or go through the page's dispatcher, which knows nothing of the row it was pressed on. The endpoint
entries that do know the row (`rowActions`) only show as a menu on rows that open nothing.

## What changes

`rowAction` accepts `endpoint` and `method`, as a `rowActions` entry does: pressing it calls that app URL with the
page's `@objectId` and the row's `{field}` tokens filled in, reads the list again, and shows a refusal in the server's
words. The existing per-row label map already leaves the button off a row whose label maps to an empty string.
