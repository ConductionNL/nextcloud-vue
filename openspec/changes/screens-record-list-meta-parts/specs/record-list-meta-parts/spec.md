# record-list-meta-parts Delta: screens-record-list-meta-parts

## ADDED Requirements

### Requirement: A meta line of parts skips the empty ones

When `content.meta` of a record list is an object with `parts`, a list of templates,
`CnRecordListWidget` SHALL fill each part on its own (after the host's translate), leave out
the parts that come out empty, and join the rest with `separator` (default " · "). A row whose
parts are all empty SHALL draw no meta line. A string `meta` SHALL behave as before.

#### Scenario: A row without a handler keeps its meta line

- **GIVEN** `meta: { parts: ["{identifier}", "{caseTypeName}", "{handler}"] }`
- **WHEN** one case has a handler and another has none
- **THEN** the first reads "2026-0082 · Woo-verzoek · Sanne" and the second "2025-0412 · Melding"
- @e2e e2e/record-list-meta-parts.e2e.js
