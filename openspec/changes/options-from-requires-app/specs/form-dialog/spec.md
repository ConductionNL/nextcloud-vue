## ADDED Requirements

### Requirement: A source from a missing app falls back to a text field

A form field whose `optionsFrom` names an app in `requiresApp` SHALL NOT read its source while that app is not
installed. The field SHALL be drawn as a text input that stores the typed value, with the block's `missingText` under
it when given.

#### Scenario: case type without Shillinq
- **GIVEN** a field `iv3TaskField` with `optionsFrom: { register: "shillinq", schema: "BbvTaakveld", valueField: "code", requiresApp: "shillinq", missingText: "Installeer Shillinq om uit de BBV-lijst te kiezen" }`
- **AND** Shillinq is not installed
- **THEN** the field is a text input with that sentence under it and no request is sent
