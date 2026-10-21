# Form dialog (delta)

## ADDED Requirements

### Requirement: A field names what a wrong value is

A field whose value does not match its `validation.pattern` SHALL show its `validation.patternMessage`, translated, and "Invalid format." when it has none.

#### Scenario: a wrong email address
- GIVEN an email field with `patternMessage` "Invalid email format"
- WHEN the agent types `jan@example`
- THEN the field reads "Invalid email format"

### Requirement: A form can ask for a field the schema hides elsewhere

A `fieldOverrides[key].hidden: false` SHALL put a `visible: false` property on the form; columns and other surfaces SHALL keep hiding it.

#### Scenario: a client's website on the create form
- GIVEN the client schema hides `website`
- WHEN the create form overrides `website` with `hidden: false`
- THEN the form asks for the website
