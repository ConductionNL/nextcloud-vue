# cell-renderer Delta

## ADDED Requirements

### Requirement: A cell formatter can read the page record

An app cell formatter SHALL receive, after its options, the record of the detail page the table sits on as
`{ objectId, object }`; outside a detail page both SHALL be null.

#### Scenario: A field shown in the case list

- **GIVEN** a case type whose list columns include "bouwkosten"
- **WHEN** the Velden table formats the "In de lijst" cell of the field bouwkosten
- **THEN** the formatter reads the case type from its fifth argument and answers Yes
