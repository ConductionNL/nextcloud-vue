# A file's second line as a list of fields, chosen per case

## Why

Two boards draw the same files widget on the case page with a different
second line under each file name: DqZaakDocumenten (a Woo case that reviews
its documents) "PDF · 1,2 MB · 14 januari 2026", DqDocumentenBeheer (a plain
case) "Inwoner · 4 okt". `nameSecondary` is one template for every record,
and a template with an empty value drops the whole line. The coordinator
decided both boards are right (24 Oct): the line is configurable.

## What changes

- CnFilesBrowser `secondLine`: a list of fields (`"type"`, `"size"`,
  `"modified|date"`, a row-data field such as `"senderName"`), each filled
  like a `nameSecondary` token and joined with " · ", an empty one left out.
  Or a list of variants `{ when, fields }`: the first whose `when` is `true`,
  or that has no `when`, is used. It takes precedence over `nameSecondary`.
  CnFilesTab forwards it.
- Widget `props` resolve `@context.<name>.<path>` (the records the detail
  page reads beside the record, `config.visibilityContext`), so a variant's
  `when` can read the case type: `"@context.caseType.documentReview.enabled"`.
  An unresolved token is a string, never `true`.
