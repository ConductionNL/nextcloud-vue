## ADDED Requirements

### Requirement: A trail label can quote what the entry recorded

An action label SHALL fill `{changed.<key>}` with the value the entry recorded
under that key, in the words `valueLabels[key]` gives it, else as written, and
with nothing when the entry recorded no such scalar value.

#### Scenario: an access purpose
- GIVEN an entry `dossiq.case.access-purpose` that recorded `purpose: handling`
- WHEN the labels are `{ "dossiq.case.access-purpose": "Opened, purpose {changed.purpose}" }` and `valueLabels` `{ purpose: { handling: "handling the case" } }`
- THEN the row reads "Opened, purpose handling the case"
