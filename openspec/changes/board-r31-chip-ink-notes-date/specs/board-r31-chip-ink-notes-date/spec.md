# board-r31-chip-ink-notes-date Delta

## ADDED Requirements

### Requirement: The grey person chip uses the soft ink

In the board look, the initials of a grey person chip SHALL use the boards' soft ink, on the normal line height.

#### Scenario: DqContacten

- **THEN** "SV" is drawn in #3d4047

### Requirement: A board note writes its moment as the boards do

In the board look, a note's moment SHALL read as day, short month and time, with the year only outside this year. The
Nextcloud look SHALL keep its full date.

#### Scenario: DqTaak Notities

- **GIVEN** a note from 6 October of this year at 11:10
- **THEN** it reads "6 okt 11:10"
