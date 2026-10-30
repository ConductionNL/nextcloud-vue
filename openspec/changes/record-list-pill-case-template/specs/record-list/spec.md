# record-list Delta

## ADDED Requirements

### Requirement: A pill case label can carry the row's values

A record-list `pill.cases` label MAY hold template tokens. The pill SHALL show the label filled from the row, in the
tone of the case that holds, and SHALL be left out when the label fills to nothing.

#### Scenario: Board PqVerkoopoverzicht won and lost deals

- **WHEN** the pill has a case for `status` won with label `{value|currency}` and variant success, and one for lost
  with variant error
- **THEN** a won deal of 12500 shows a green pill with its amount and a lost deal of 5400 a red one
- **AND** a deal without a value shows no pill
