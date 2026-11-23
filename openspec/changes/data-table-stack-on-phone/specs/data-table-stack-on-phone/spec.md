## ADDED Requirements

### Requirement: A table can stack its rows on a phone

A table with `stackOnPhone` SHALL, on a screen up to 600px wide, draw each row as a block with one line per cell that
names its column, and SHALL keep the table layout on wider screens. A table without it SHALL not change.

#### Scenario: the check-in roster on a phone
- **GIVEN** the roster table with `stackOnPhone`
- **WHEN** it is opened on a 375px screen
- **THEN** every participant is a block of named lines and nothing scrolls sideways
