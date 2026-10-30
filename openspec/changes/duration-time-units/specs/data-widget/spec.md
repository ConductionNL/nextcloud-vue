# duration-time-units Delta: data-widget

## ADDED Requirements

### Requirement: A duration in hours or minutes reads in words

A field shown with `format: "duration"` SHALL read a one-unit time of hours or minutes in words, in the reader's
language. A period of more than one unit SHALL show as stored.

#### Scenario: A six-minute call

- **GIVEN** a contact moment whose duration is `PT6M`
- **WHEN** a Dutch reader opens it
- **THEN** Duur SHALL read "6 minuten"
