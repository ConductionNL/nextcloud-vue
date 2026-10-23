## ADDED Requirements

### Requirement: The search can show its kind as plain text

With `kindAsText: true` the search source's Kind column SHALL show, as plain text, each row's kind `rowLabel` filled from the found object, or else the kind's label. Without it the column SHALL be unchanged.

#### Scenario: An object row
- **GIVEN** the objects kind with `rowLabel: "{objectType}"` and `kindAsText`
- **WHEN** a lamppost is found
- **THEN** its Kind cell SHALL read "Lantaarnpaal" as plain text
