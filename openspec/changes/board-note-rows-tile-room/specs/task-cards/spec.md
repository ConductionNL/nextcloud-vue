# task-cards Delta

## ADDED Requirements

### Requirement: A board note row keeps its tile room and two lines

In the board look, a note row SHALL keep 44px before its text for the initials tile, also when it is the only note in its
thread. Its Delete and Reply buttons SHALL sit out of the flow, shown on hover and on keyboard focus, so that the row is
the note's two lines.

#### Scenario: DqTaak Notities

- **GIVEN** the note "Commissie kan alleen op dinsdag of woensdag" by Pieter Jansen
- **THEN** the "PJ" tile sits at the row's start, the text starts 44px in, and the row is about 61px tall
