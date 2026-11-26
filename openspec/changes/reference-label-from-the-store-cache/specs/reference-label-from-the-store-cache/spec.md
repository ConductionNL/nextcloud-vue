## ADDED Requirements

### Requirement: A reference label comes from the store's cached object first

When `CnFormDialog` resolves the label of a reference field that holds an id, it SHALL take the label from the object store's cached copy of that object when the store holds one, and SHALL NOT read the object again. When the store holds no copy, it SHALL fetch the object by id as before.

#### Scenario: The caller already read the referenced object
- **GIVEN** the object store holds case type `ct-1` (read by the caller before the dialog opened)
- **WHEN** a form opens with `caseType: ct-1`
- **THEN** the case type field SHALL show the case type's name and the dialog SHALL NOT fetch `ct-1`

#### Scenario: Nothing cached
- **GIVEN** the object store holds no copy of `ct-1`
- **WHEN** the same form opens
- **THEN** the dialog SHALL fetch `ct-1` by id and show its name

@e2e exclude Asserted in tests/components/CnFormDialogCachedReferenceLabel.spec.js; the saved request is visible only in a network waterfall on a live instance.
