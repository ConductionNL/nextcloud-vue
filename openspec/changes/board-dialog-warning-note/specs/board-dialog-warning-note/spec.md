# board-dialog-warning-note Delta: board-dialog-warning-note

## ADDED Requirements

### Requirement: A board dialog's warning note takes the status warning look

In a board-look dialog, a warning note SHALL draw on the status warning ground in the warning ink, at radius 8 with
10px 14px padding, its text 14px on a 1.45 line, and a 4px edge in the ink.

#### Scenario: An unmatched incoming call

- **GIVEN** the intake dialog for a caller that matches no contact
- **WHEN** it opens in the board look
- **THEN** "Geen contact gevonden bij ..." SHALL read in the warning ink on the warning ground at radius 8
