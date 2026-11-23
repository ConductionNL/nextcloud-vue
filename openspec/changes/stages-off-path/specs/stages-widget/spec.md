# stages-widget Delta

## ADDED Requirements

### Requirement: A side status stays off the strip unless it is current

A stages widget with `offPathField` SHALL leave out every stage whose row holds true at that field, except the stage the record is in.

#### Scenario: DqSociaalDomein

- **GIVEN** "Verlenging aangevraagd" and "Ingetrokken" are marked off the path and the case is in Onderzoek
- **THEN** the strip draws Melding ontvangen to Afgehandeld, eight stages

#### Scenario: a withdrawn case

- **GIVEN** the case is in Ingetrokken
- **THEN** the strip draws Ingetrokken too
