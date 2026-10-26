# record-list Delta

## ADDED Requirements

### Requirement: A pill can take its colour from the row

A record-list pill MAY name `variantWhen`, a list of `{ when, variant }`. The first rule whose condition holds for the row
SHALL set the pill's colour, ahead of `colorMap` and the pill's own `variant`.

#### Scenario: A finished case

- **GIVEN** a case row with `isFinalStatus: true` and status "Afgehandeld"
- **AND** `variantWhen: [{ when: { field: "isFinalStatus", op: "eq", value: true }, variant: "success" }]`
- **THEN** its pill is green

### Requirement: A side row's pill and date stand 8px apart

In the board look, a side card row's pill and the date after it SHALL stand 8px apart.

#### Scenario: DqOrganisatie Lopende zaken

- **THEN** "Besluit" and "termijn 20 okt" are 8px apart
