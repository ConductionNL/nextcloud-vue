# index-list-board-look Delta: index-footer-note-on-one-page

## ADDED Requirements

### Requirement: A board list on one page can end in its note alone

An index page in the board look with `pagerOnOnePage: false` SHALL, while its list fits on one page and it has a
footer note, show that note alone in the footer, without the count and without the page links. With more than one
page, without a note, or without the key, the footer SHALL be drawn as before.

#### Scenario: Board PqWachtrij

- **GIVEN** the queue with `pagerOnOnePage: false` and nine waiting tickets
- **WHEN** the agent opens Wachtrij
- **THEN** the card ends in "Oudste eerst. Een ticket verlaat de wachtrij zodra iemand het in behandeling neemt."
- **AND** no "9 van 9" and no "1 Volgende" are drawn
