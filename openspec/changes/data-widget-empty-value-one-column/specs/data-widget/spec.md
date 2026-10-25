## ADDED Requirements

### Requirement: A field can name its empty value

The data widget SHALL show `overrides[key].emptyValue`, translated, for a field whose value is null, undefined, empty or
false, and SHALL show a filled value as before.

#### Scenario: nobody handed on
- **GIVEN** `overrides.handoverTo.emptyValue` "Nobody" and no `handoverTo`
- **THEN** the cell reads "Niemand" to a Dutch reader

### Requirement: The board look keeps a single column

In the board look the data widget SHALL lay out one column when `columns` is 1, and fit 200px columns otherwise.

#### Scenario: seats card
- **GIVEN** a seats card with `columns: 1`
- **THEN** its pairs stand one under the other
