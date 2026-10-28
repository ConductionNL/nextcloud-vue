# detail-page Delta

## ADDED Requirements

### Requirement: A crumb can show for one kind of record

A breadcrumb crumb with `visibleWhen` SHALL show only when its condition holds for the record in view.

#### Scenario: PqContactmoment

- **GIVEN** a ticket of type interaction
- **THEN** the trail reads "Contactmomenten / PQ-2026-0423", and a request keeps "Vragen en meldingen"

### Requirement: The next step can differ per kind of record

`nextStep.variants` SHALL let the first variant whose `when` holds replace the declared title and stages.

#### Scenario: PqContactmoment Wat nu?

- **GIVEN** a contact moment in progress
- **THEN** the card lists "De klant is bekend", "Gekoppeld aan het verzoek waar het over ging" and "De uitkomst is genoteerd"
