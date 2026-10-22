# Proposal: reference-preview-from-page

## Why

case-page-and-list-as-a-place (dossiq, REQ-CPL-03) wants a reference on the case page, such as a related case, to show
a summary without leaving the page. `pages[].referencePreview` validates against the schema and CnReferencePreview is
exported, but no component read the page key, so nothing ever mounted a preview (dossiq's e2e keeps the scenario as
`test.fixme`).

## What changes

- CnPageRenderer provides `cnReferencePreview`: `enabled` follows the current page's `referencePreview`, and
  `targetFor(routeName)` gives the register and schema of the detail page a route opens.
- CnRecordListWidget, on such a page, draws the title of a row that opens a detail page (`rowRoute`) as a
  CnReferencePreview of that record. The title becomes the reference: it opens the record on activation, and the row is
  no longer a link around it. The record is loaded from OpenRegister; one the reader may not read loads nothing.
- Without the page key nothing changes.

No schema change: the key is already in the schema.
