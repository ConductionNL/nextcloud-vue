# object-list-widget

## ADDED Requirements

### Requirement: A row can open the page its field names, and a list can create through an app endpoint

With `rowRouteField` and `rowRouteMap`, a row SHALL open the route the map gives for the row's value of that field, for the id at `rowRouteIdField` (else the row's id), falling back to `rowRoute`. With `createEndpoint`, a new row SHALL be posted to that endpoint, under `bodyKey` when given, beside `extra`. An `fkResolve` cell with `schemaFrom` SHALL resolve the reference in the schema the map gives for the row's field.

#### Scenario: A relationship to an organisation
- **GIVEN** a relationship row with `toType: client` and `toContact: k-9`
- **WHEN** the user opens the row
- **THEN** the client page of k-9 opens
