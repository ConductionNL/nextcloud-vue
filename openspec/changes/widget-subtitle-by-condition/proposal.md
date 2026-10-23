# Proposal: widget-subtitle-by-condition

## Why

DqZaakDocumenten draws "Per document beoordelen of het openbaar kan. Wat deels openbaar is, lakt u daarna." under the
Files card. That line belongs to case types that review their documents (`documentReview.enabled`); on any other case
type it would be wrong. A widget's `subtitle` was one string for every record.

## What changes

- `pickConditionalText(spec, data)`: a string as it is, or `[{ when, text }]`, the first entry whose `when` (the
  `visibleWhen` grammar) holds; '' without a record or a holding entry.
- CnDetailWidgetHost reads a widget's `subtitle` that way, against the record and the rows the detail page reads beside
  it (`cnDetailVisibilityRows`, `@context.<name>`), and shows nothing while those are on their way.

No schema change.
