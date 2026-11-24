# Delta for detail-page

## ADDED Requirements

### Requirement: A header pill can read a value from an endpoint
A `typePill` or `statusPill` with `endpointSource` (and no `field`, `text` or `countFrom`) MUST show the value the endpoint answers at its `responsePath`, mapped through `labels`, `colorMap` and `values` exactly as a field pill maps a field. The request MUST resolve the `@objectId` and `@object.<field>` tokens like a widget's `endpointSource`. Nothing MUST render while the value is being read, after a failed read, or when the value is empty or not a string or number. The pill MUST read again when the record or its resolved request changes.

#### Scenario: A pupil's state today in the header
- GIVEN a detail page with `statusPill: { endpointSource: { url: '/apps/learniq/api/pupils/@object.ncUserId/page', responsePath: 'header.statePill.value' }, labels: { 'in-class': 'In de klas' } }`
- AND the endpoint answers `{ header: { statePill: { kind: 'today', value: 'in-class' } } }` for Vera
- WHEN her page opens
- THEN the header shows the pill "In de klas"

#### Scenario: A failed read shows no pill
- GIVEN the same pill
- WHEN the endpoint answers an error
- THEN no status pill renders and the page still opens
