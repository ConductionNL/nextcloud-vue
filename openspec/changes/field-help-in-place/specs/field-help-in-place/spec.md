# Spec: Field help in place

## ADDED Requirements

### Requirement: A schema property carries an explanation separate from its description
`fieldsFromSchema()` SHALL read a property's `x-help`, a string or a map of
language codes to strings, and SHALL emit it as the field's `help` in the
user's language, falling back as the schema's other labels do, or `''` when
absent. A value of any other type SHALL be ignored with one console warning
naming the property. The existing keys `description` and `descriptionLong`
SHALL be unchanged.

#### Scenario: a property with help
@e2e exclude Pure function: tests/utils/fieldsFromSchemaHelp.spec.js
- **GIVEN** a property `wooCategory` with `description` "The Woo category" and `x-help` {"nl": "Kies de categorie uit art. 3.3 Woo ...", "en": "Pick the category from art. 3.3 ..."}
- **WHEN** `fieldsFromSchema()` runs for a Dutch user
- **THEN** the field has `description` "The Woo category" and `help` "Kies de categorie uit art. 3.3 Woo ..."

#### Scenario: a malformed help value
@e2e exclude Pure function: tests/utils/fieldsFromSchemaHelp.spec.js
- **GIVEN** a property with `x-help` set to a number
- **WHEN** `fieldsFromSchema()` runs
- **THEN** the field has `help` '' and one warning names the property

### Requirement: Every field with help offers a toggletip that opens it in place
`CnFieldHelper` SHALL render a button when `help` or `more` is present, named
"About {label}" through its accessible name, with `aria-expanded`. Enter,
Space and a click SHALL toggle it; Escape SHALL close it and return focus to
the button. The opened text SHALL be `help`, followed by `more` when both are
present, rendered as text and announced through a polite live region. The
button SHALL stay available while the field shows an error. Without `help`
and `more`, the component SHALL render exactly as before.

#### Scenario: an officer opens the explanation with the keyboard
@e2e exclude Component contract: tests/components/CnFieldHelper.spec.js, plus the axe check in tests/components/CnFormDialog.spec.js
- **GIVEN** a form field "Woo category" with help text
- **WHEN** the officer tabs to "About Woo category" and presses Enter
- **THEN** the explanation opens next to the field, `aria-expanded` is true, the text is announced, and Escape closes it with focus back on the button

#### Scenario: help stays reachable when the field is in error
@e2e exclude Component contract: tests/components/CnFieldHelper.spec.js
- **GIVEN** a field with help and a validation error
- **WHEN** it renders
- **THEN** the error shows and the help button is still there

#### Scenario: a field without help is unchanged
@e2e exclude Snapshot contract: tests/components/CnFieldHelper.spec.js
- **GIVEN** a field with a short description and no `x-help`
- **WHEN** it renders
- **THEN** the markup equals the markup before this change

### Requirement: The library's form surfaces pass help through
`CnFormDialog`, `CnAdvancedFormDialog`, and every component that renders
`CnFieldHelper` for a schema field, SHALL pass the field's `help` to it, so a
schema author's `x-help` reaches every form the library draws, including the
create and edit dialogs of `CnIndexPage`.

#### Scenario: a create dialog shows the help from the schema
@e2e exclude Library-level mount: tests/components/CnFormDialogHelp.spec.js mounts CnIndexPage's create dialog over a schema with x-help
- **GIVEN** an index page over a schema whose `title` property carries `x-help`
- **WHEN** the officer opens the create dialog
- **THEN** the title field shows the "About Title" button and it opens the help text
