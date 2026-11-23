# record-list-string-rows Delta: record-list-string-rows

## ADDED Requirements

### Requirement: A record list draws rows that are plain strings

`CnRecordListWidget` SHALL read a row that is a string or number as
`{ value }`, so a template reaches it as `{value}` and a list without `title`
shows the value. With `presentation: "notice"` it SHALL draw its rows as one
paragraph of sentences in a `role="note"` box toned by `variant` (`info`,
`warning`, `error`; `info` when unset or unknown), after `lead` with `{total}`
filled in, and SHALL show the empty text when there are no rows.

#### Scenario: Publish warnings as a warning notice

- **GIVEN** an endpoint answering `{ warnings: ["A.", "B."] }` and a list with `responsePath: "warnings"`, `presentation: "notice"`, `variant: "warning"`, `lead: "{total} warnings:"`
- **WHEN** the list renders
- **THEN** it draws one warning box reading "2 warnings: A. B." and no list
