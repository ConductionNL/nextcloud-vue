# facts-widget Delta

## ADDED Requirements

### Requirement: A facts row can take its label from the record or its context

A facts row with `labelPath` SHALL be labelled by the text at that path on the record or on the page's `@context`
records, and by its `label` when that path holds no text.

#### Scenario: DqSociaalDomein

- **GIVEN** a Jeugdwet case whose case type sets `handlerLabel: "Regisseur"`
- **THEN** the report card's handler row reads "Regisseur: Fatma Kaya"
- **AND** on an objection case without `handlerLabel` it reads "Behandelaar"
