## ADDED Requirements

### Requirement: A form takes definitions its caller already read

`CnFormDialog` SHALL accept `preloadedDefinitions`, keyed by driving field, each `{ value, records }`. While the driving field holds `value`, the form SHALL build its data-driven fields from `records` and SHALL NOT read the definitions again. For any other value, or an entry without a `records` array, the form SHALL read the definitions as it does without the prop.

#### Scenario: The form opens on the value the caller read
- **GIVEN** a create form seeded with `caseType: ct-1` and `preloadedDefinitions: { caseType: { value: 'ct-1', records: [...] } }`
- **WHEN** the form opens
- **THEN** it SHALL show the records' fields and SHALL NOT request the definitions

#### Scenario: The person picks another value
- **GIVEN** the same form
- **WHEN** the case type changes to `ct-2`
- **THEN** the form SHALL request the definitions for `ct-2` as usual

@e2e exclude Asserted in tests/components/CnFormDialogPreloadedDefinitions.spec.js; the saved request is visible only in a network waterfall on a live instance.
