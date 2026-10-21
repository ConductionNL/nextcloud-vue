# Form dialog (delta)

## ADDED Requirements

### Requirement: A field names what a wrong value is

A field whose value does not match its `validation.pattern` SHALL show its `validation.patternMessage`, translated, and "Invalid format." when it has none.

#### Scenario: a wrong email address
- GIVEN an email field with `patternMessage` "Invalid email format"
- WHEN the agent types `jan@example`
- THEN the field reads "Invalid email format"
