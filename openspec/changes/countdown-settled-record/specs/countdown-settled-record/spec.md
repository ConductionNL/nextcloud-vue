## ADDED Requirements

### Requirement: A settled record never reads as overdue

When `settledField` is configured and the record's value at that path is truthy, the countdown widget SHALL show `settledLabel` (translated through the host) or "Closed", in the default colour. It SHALL NOT show a count of days overdue.

#### Scenario: A closed case past its deadline
- **GIVEN** a countdown with `settledField: isFinalStatus`
- **WHEN** the record's deadline was 24 days ago and `isFinalStatus` is true
- **THEN** the tile SHALL read "Closed" in the default colour

#### Scenario: An open case past its deadline
- **GIVEN** the same tile
- **WHEN** `isFinalStatus` is false
- **THEN** the tile SHALL read "24 days overdue" in the error colour

@e2e exclude Pure computed rendering, covered by tests/components/CnCountdownWidget.spec.js.
