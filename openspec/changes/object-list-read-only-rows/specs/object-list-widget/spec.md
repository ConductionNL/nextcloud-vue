# object-list-widget Delta

## ADDED Requirements

### Requirement: A list can add read-only rows from an endpoint

An object list with `content.readOnlyRows` SHALL show, after its own rows, the rows the named endpoint answers that
match `where`, each marked read only: without row actions and opening nothing when clicked. The list's own rows SHALL
keep their actions and editing.

#### Scenario: A case type's inherited fields

- **GIVEN** the Velden list with `readOnlyRows` on the blueprint's propertyDefinitions where origin is inherited
- **THEN** the type's own fields are listed with their actions, followed by the inherited fields without any
