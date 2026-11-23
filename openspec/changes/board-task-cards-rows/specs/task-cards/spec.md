# task-cards Delta

## ADDED Requirements

### Requirement: Board appointment and note rows carry a tile and a meta line

An appointment row SHALL carry the day of the month it starts on, and a note row SHALL carry its author's initials, as a
tile before the text. In the board look the tile SHALL be 32px and round, every row SHALL have a hairline above it, the
title SHALL be 15px in weight 600 and the meta SHALL be one 13px muted line joined with " · ". Outside the board look the
tile SHALL NOT show.

#### Scenario: DqTaak Afspraken

- **GIVEN** the task "Hoorzitting inplannen" with an appointment starting 21 October at 14:00 in "zaal 2.04"
- **THEN** its row starts with a tile reading "21" and its meta line ends in " · zaal 2.04"

#### Scenario: DqTaak Notities

- **GIVEN** a note by Pieter Jansen
- **THEN** its row starts with a tile reading "PJ" and the note's text is the title
