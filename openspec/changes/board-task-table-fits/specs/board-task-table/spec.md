## ADDED Requirements

### Requirement: The board task table fits its card

In the board look, the task table in a detail card SHALL wrap a long task name and its line instead of widening the
table, and SHALL keep a row's button and its task menu on one line.

#### Scenario: long task name
- **GIVEN** a task "Stukken opvragen bij Mobiliteit en verkeer" in the case's task table
- **WHEN** the Taken tab opens
- **THEN** the table SHALL be no wider than its card, and the name SHALL wrap
