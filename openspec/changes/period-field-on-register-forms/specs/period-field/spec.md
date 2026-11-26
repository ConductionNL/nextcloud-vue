# Delta: period-field

## ADDED Requirements

### Requirement: A register-source widget form keeps the date field for the period (REQ-PF-001)

The stat, stats-block and table/object-list forms SHALL offer an optional "Date field for the period" when the host provides `cnOffersPeriodField`. Its options SHALL be the source's date fields: the fields whose every value in a sample of the source's records reads as an ISO date. A stored choice SHALL stay selectable. The choice SHALL be written as the source's `periodField` only when it is set, and without the provide the forms SHALL show no such field and SHALL emit the content they always did.

#### Scenario: A table follows the dashboard period

- **GIVEN** a host that provides `cnOffersPeriodField: true`
- **AND** a table widget on register `zaken`, schema `zaak`, whose records hold `startDate` as `2026-10-02`
- **WHEN** the author chooses `startDate` as the date field for the period
- **THEN** the form emits the content with `periodField: "startDate"`

#### Scenario: An app without a dashboard period

- **GIVEN** a host that does not provide `cnOffersPeriodField`
- **WHEN** the stat form renders
- **THEN** no date field for the period is shown and no records are sampled for it
