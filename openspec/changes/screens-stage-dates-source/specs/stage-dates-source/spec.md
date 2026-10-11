# stage-dates-source Delta: screens-stage-dates-source

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-stage-dates-source](../../)

## Purpose

The process bar's reached dates from a per-record endpoint, as DqZaak draws them.

## ADDED Requirements

### Requirement: The reached dates can come from their own endpoint

The stages widget SHALL accept `content.datesSource` with a `url` and optional
`method`, `params`, `path`, `idField` (default `id`) and `dateField` (default
`reachedAt`). Tokens in the url and params SHALL resolve against the record.
The widget SHALL read it once per record, and again on a page refresh. It SHALL
take the rows at `path`, or the response when that is a list, and use the value
at `dateField` as the date of the step whose id equals the row's `idField`. A
step without such a row SHALL keep the stage list's own date. A failed read
SHALL leave the stage list's dates. Without `datesSource` the widget SHALL
request nothing new.

#### Scenario: The DqZaak bar

- **GIVEN** a case in its second status, steps from the case type's statuses, and `datesSource` pointing at `/blueprint?case=@objectId`, which answers `reachedAt` for the first two, under the board look
- **WHEN** the bars render
- **THEN** the first step reads "3 okt", the second "sinds 4 okt", the third no date, and the dates endpoint was asked once

@e2e include `e2e/stages-dates-source.e2e.js` on the harness; live on dossiq/DqZaak once the app sets the option.
