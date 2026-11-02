# form-dialog Delta: form-textarea-follows-rows

## ADDED Requirements

### Requirement: A board text area is as many lines as its rows

In the board look, a form text area whose field sets `rows` SHALL be that many lines tall on the normal leading, plus
its padding and border. A text area without its own `rows` SHALL stay three lines tall.

#### Scenario: Board PqTicketBewerken

- **GIVEN** the ticket edit form with "Bericht aan de klant" at `rows: 2` and "Omschrijving" at `rows: 3`
- **THEN** "Bericht aan de klant" is 58px tall and "Omschrijving" 76px
