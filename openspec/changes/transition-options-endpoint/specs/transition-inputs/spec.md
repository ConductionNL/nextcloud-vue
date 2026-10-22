# transition-inputs Delta: transition-options-endpoint

## ADDED Requirements

### Requirement: A select input reads its choices from an endpoint

An input with `optionsEndpoint` SHALL read its rows from that endpoint when the inputs load, with every
`@context.<path>` in its url (URL-encoded) and params filled from the context, and SHALL offer them as a select read
through `optionValue` and `optionLabel`. Without rows, a failed read included, the input SHALL be hidden as an
`optionsSource` input without rows is.

#### Scenario: A coordinator picks a substitute

- **GIVEN** a lesson in the context and an input reading `/api/sessions/@context.session.id/candidates`
- **WHEN** the inputs load
- **THEN** the teachers the endpoint answers are the choices, in its order
