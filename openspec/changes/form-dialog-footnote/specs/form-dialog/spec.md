# form-dialog Delta: form-dialog-footnote

## ADDED Requirements

### Requirement: A form can close on a note

CnFormDialog SHALL draw its `footnote` as a note under the last field, with an information icon, and SHALL draw none
when it is empty. CnDetailPage SHALL give its record edit form the `editFootnote`, through the host translate.

#### Scenario: Board PqTicketBewerken

- **GIVEN** the ticket page with `editFootnote` set
- **WHEN** the agent opens "Ticket bewerken"
- **THEN** the form ends on the note, under "Bericht aan de klant", across the form's width
