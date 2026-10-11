---
kind: code
---

# Proposal: screens-stage-dates-source

## Summary

DqZaak's process bar reads "Ontvangen 3 okt", "In behandeling sinds 4 okt"
(round6/dossiq/library-gaps.md 16). The stages widget draws a date line from
the stage list's own `dateField` (screens-stage-bar-dates-parity formats it).
dossiq's simple case page lists the steps from the case type's statuses, which
carry no per-case dates. The dates come from a per-case endpoint:
`GET /apps/dossiq/api/case-types/{id}/blueprint?case=<caseId>` answers the
statuses with `reachedAt`.

## What changes

The stages widget takes `content.datesSource`:
`{ url, method?, params?, path?, idField?, dateField? }`. The url and params use
the endpoint token grammar (`@objectId`, `@object.<field>`), as `stagesEndpoint`
does. It is read once through the shared endpoint engine (dedup, cache, read
again on `cn:page:refresh`). The rows at `path` (or the response itself when it
is a list) are keyed by `idField` (default `id`), and the value at `dateField`
(default `reachedAt`) becomes that step's date. A step it does not date keeps
the stage list's own date. Under the board look the bars show the dates in the
short form ("3 okt", "sinds 4 okt").

Widget content is not described by the manifest schema, so this needs no
schema change. A widget without `datesSource` requests nothing new.
