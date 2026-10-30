# object-list Delta

## ADDED Requirements

### Requirement: A formatter column reads the schema's enum labels

A list column that names a `formatter` and states no enum SHALL carry the schema property's `enum` and enum labels to
its cells, so a formatter that prints an enum's label finds it.

#### Scenario: PqProject Taken in deze cyclus

- **GIVEN** a status column `{ widget: "badge", formatter: "enumLabel" }` on a schema whose status has `x-enum-labels`
- **THEN** the pills read "In behandeling" and "Klaar", not "inProgress" and "closed"
