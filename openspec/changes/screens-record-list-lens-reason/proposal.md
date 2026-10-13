---
kind: code
---

# Proposal: screens-record-list-lens-reason

## Summary

A table says why a personal lens is empty (`lens-says-why-it-is-empty`): OpenRegister reports
`@self.lenses.<lens> = { available: false, reason }` and `CnDataTable` shows the explanation in its empty
row. A record list that asks for the same lens (Recent on dossiq's Mijn werk) showed its generic empty text.

## What changes

`CnRecordListWidget` reads `@self.lenses` of its response and, when the list is empty and a lens is
unavailable for a reason there is text for, shows that text in place of `emptyText`. `content.lensReasonTexts`
holds the app's wording, keyed `<lens>.<reason>` or `<reason>`. It uses the same helpers as the table
(`readLensReports`, `lensUnavailableText`).

No schema change (widget content is an open object).
