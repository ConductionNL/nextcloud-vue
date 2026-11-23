## ADDED Requirements

### Requirement: The tasks source forwards a kind

The `tasks` entity source SHALL forward `kind` to the inbox read when a page
asks for it, and SHALL declare `kind` as a single-valued search field so a
sidebar facet on it narrows the list rather than logging an error.

A parameter the endpoint does not accept SHALL still be dropped, and no
parameter naming a user SHALL ever be forwarded: whose inbox is answered
stays the endpoint's decision.

#### Scenario: A page asks for one sort of work

- **GIVEN** a Tasks page whose sidebar carries a `kind` facet
- **WHEN** the viewer picks the reminder kind
- **THEN** the inbox read SHALL carry `kind=reminder`
- **AND** the results SHALL be the reminders alone

#### Scenario: An unknown key is still dropped

- **GIVEN** a loader config carrying a key the endpoint does not accept
- **WHEN** the inbox loads
- **THEN** that key SHALL NOT reach the request
