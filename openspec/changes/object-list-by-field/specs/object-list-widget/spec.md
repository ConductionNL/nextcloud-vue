# object-list-widget

## ADDED Requirements

### Requirement: A row can open the page its field names, and a list can create through an app endpoint

With `rowRouteField` and `rowRouteMap`, a row SHALL open the route the map gives for the row's value of that field, for the id at `rowRouteIdField` (else the row's id), falling back to `rowRoute`. With `createEndpoint`, a new row SHALL be posted to that endpoint, under `bodyKey` when given, beside `extra`. An `fkResolve` cell with `schemaFrom` SHALL resolve the reference in the schema the map gives for the row's field.

#### Scenario: A relationship to an organisation
- **GIVEN** a relationship row with `toType: client` and `toContact: k-9`
- **WHEN** the user opens the row
- **THEN** the client page of k-9 opens

### Requirement: A date cell can say its state, and groups keep a set order

A `date` cell SHALL show `pastText` beside a past date and `otherText` beside a later or empty one. An object list SHALL list the groups `groupOrder` names first, in that order.

#### Scenario: an ended relationship
- GIVEN a relationship whose end date has passed
- THEN its row reads the date in red and "Ended"; one without an end date reads "Active"

#### Scenario: an organisation's relationships
- GIVEN `groupOrder` Organisatie, Professioneel, Familie
- THEN the Organisatie group comes first whatever order the rows came in
