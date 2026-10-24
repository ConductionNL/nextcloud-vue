# data-table Delta

## ADDED Requirements

### Requirement: A linked row keeps the checkbox switch's input out of the flow

A table row with a route SHALL lift its controls above the row link without moving a checkbox switch's hidden input
into the flow, so a selection column does not change the row's height.

#### Scenario: The case types list

- **GIVEN** the case types table with a selection column and rows that open the case type
- **THEN** a two-line row is 66px, as DqZaaktypen draws it
