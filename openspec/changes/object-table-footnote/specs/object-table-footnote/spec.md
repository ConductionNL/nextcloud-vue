# object-table-footnote

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: An object table can carry a footnote

CnWidgetObjectTable SHALL draw its `footnote` under the table in muted 13px text, 12px below it, through the host
translate. It SHALL NOT draw the footnote while a refused or failed endpoint read shows no table.

#### Scenario: DqTermijnen Ingebrekestellingen
- GIVEN the notices table with a footnote
- WHEN the rows load
- THEN the footnote reads under the table
