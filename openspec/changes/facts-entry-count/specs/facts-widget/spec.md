# facts-widget Delta

## ADDED Requirements

### Requirement: A facts entry can count a related list

A facts entry with `countFrom` SHALL show the number of records the named list holds for the given filter, resolved
against the record shown. While the count cannot be read the row SHALL be left out; a count of zero SHALL show.

#### Scenario: Running cases of a case type

- **GIVEN** an entry `{ label: "Running cases", countFrom: { register: "dossiq", schema: "case", filter: { caseType: "@objectId", isFinalStatus: false } } }`
- **THEN** the Gegevens card reads "Lopende zaken 43" when 43 such cases exist
