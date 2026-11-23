# contact-moment-parts Delta

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A facts lead can be a linked card with a status pill

A facts `lead` entry with `card: true` SHALL draw as a bordered row; with `route` the whole lead SHALL be a link to that route; with `pill` it SHALL end on a status pill whose label is the mapped value and whose tone is looked up by the raw value.

#### Scenario: the request a contact moment is about

- **GIVEN** a lead with `card: true`, a route to the request and `pill: { path: "status", variantMap: { "in_progress": "purple" } }`
- **WHEN** the request is in progress
- **THEN** the lead is a bordered link to the request ending on a purple "In behandeling" pill

### Requirement: A what-now stage can state a bold sentence

A `nextStep` stage with `afterTitle` SHALL draw that text in 15px semibold main ink above its `after` line.

#### Scenario: a contact moment has nobody to answer

- **THEN** the side reads "Een contactmoment heeft geen klant om te beantwoorden." in bold above "Rond af via Meer, Contactmoment sluiten."

### Requirement: The notes outcome button can be the primary one

A record-notes widget with `outcome.saveVariant: "primary"` SHALL draw its outcome button as the primary button; without it the button stays secondary.

#### Scenario: Uitkomst noteren

- **THEN** "Uitkomst noteren" is the primary button of the notes section
