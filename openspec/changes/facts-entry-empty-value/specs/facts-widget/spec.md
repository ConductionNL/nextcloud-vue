## ADDED Requirements

### Requirement: A facts entry can name its empty value

A facts entry with a non-empty `emptyValue` SHALL show that text, translated,
when its own value is empty, and SHALL then be drawn even when the card hides
empty entries. An entry with a value SHALL show its value; `emptyValue` SHALL
NOT get the entry's `suffix`.

#### Scenario: an override nobody set reads "No"
- GIVEN a case without `priorityOverride`
- WHEN the facts card shows `{ "path": "priorityOverride", "label": "Overridden", "emptyValue": "No" }` with `hideEmpty` on
- THEN the row "Overridden" is drawn and reads "No"

#### Scenario: a set override reads its value
- GIVEN a case whose `priorityOverride` is `high`
- WHEN the same entry is shown with `map: { "high": "High" }`
- THEN the row reads "High"
