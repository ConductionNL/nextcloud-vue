# object-data-widget Delta: data-widget-value-pill

## ADDED Requirements

### Requirement: A field can show its value as a pill

A data widget field whose override carries `pill: { variantMap }` SHALL draw its shown value as a status pill, toned by
the variant `variantMap` names for the raw value, else the default tone. A field without `pill` SHALL stay text.

#### Scenario: A settled transaction

- **GIVEN** a transaction with status `settled`, labelled "Settled", and `pill: { variantMap: { settled: "success" } }`
- **WHEN** the data widget draws the status
- **THEN** it is a green "Settled" pill
