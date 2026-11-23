# data-table Delta

## ADDED Requirements

### Requirement: A board head's plain label wraps beside its filter

In the board look, an unsortable head label followed by a filter funnel SHALL wrap by word within the cell less the
funnel's room, with the funnel beside it, so the funnel does not take a line of its own.

#### Scenario: DqOrganisaties

- **GIVEN** the organisations list with the unsortable "Lopende zaken" column filterable
- **THEN** the head reads "Lopende / zaken" with the funnel beside it, and the head row is about 59px
