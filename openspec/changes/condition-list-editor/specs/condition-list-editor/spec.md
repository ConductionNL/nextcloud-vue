# condition-list-editor

## ADDED Requirements

### Requirement: Conditions are rows over the object's own fields

`CnConditionListEditor` SHALL draw one row per condition with a field, an operator and a value, offer only the
operators that fit the field's type, hide the value for "is filled in", and emit the whole list on every change in both
v-model dialects.

#### Scenario: A number field compares

- **GIVEN** the fields Bouwkosten (number) and Welstandsgebied (yes/no)
- **WHEN** a condition on Bouwkosten is added
- **THEN** its operators are is, is not, greater than, at least, less than, at most and is filled in
- **AND** choosing "greater than" and typing 100000 emits `[{ field: "bouwkosten", operator: "gt", value: 100000 }]`

#### Scenario: A yes/no field is a choice

- **GIVEN** the condition is on Welstandsgebied
- **THEN** the operator is "is" and the value is a choice of yes and no

### Requirement: A condition reads as the words of a rule

`conditionSentence(condition, fields)` SHALL return the condition as a translated clause, with the value formatted by
its field.

#### Scenario: DqZaaktypeRegels

- **GIVEN** the language is Dutch
- **THEN** `{ field: "bouwkosten", operator: "gt", value: 100000 }` on a currency field reads "Bouwkosten groter is dan € 100.000"
- **AND** `{ field: "welstandsgebied", operator: "eq", value: true }` reads "Welstandsgebied ja is"
