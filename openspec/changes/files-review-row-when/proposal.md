# Files browser entries that apply only to some records

## Why

DqZaakDocumenten draws each document row with its verdict pill and a
"Beoordelen" button; DqDocumentenBeheer draws neither. The files widget is
the same on both case pages, so a column and a row button need a condition,
and the button must open the assessment for that one document.

## What changes

- A declared column, row action or row button with `when` is used only when
  `when` is `true` (written as `@context.<name>.<path>`, resolved by the
  detail page; see files-second-line-fields). Without `when` nothing changes.
- An `open-modal` action's `rowProps: { prop: field }` adds the clicked
  file's row-data fields to the modal's props, beside `fileId`, `fileName`
  and `path`.
