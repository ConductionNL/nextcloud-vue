# form-dialog Delta: forms-dotted-path-fields

**Status**: in-progress
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A field can edit one key inside an object property

A field override key or include entry that is a dotted path SHALL produce a field for the property it names inside an object property, with that property's widget. CnFormDialog and CnObjectDataWidget SHALL show the value from inside the object and save the object with the edited key and its other keys unchanged.

#### Scenario: Teams of a case type

- **GIVEN** a case type with `handling: { teams: ['woo'], deadline: 28 }` and a form with `fieldOverrides: { 'handling.teams': {} }`
- **WHEN** the reader adds the team `avg` and saves
- **THEN** the saved object has `handling: { teams: ['woo', 'avg'], deadline: 28 }`

#### Scenario: An object property with a widget from config

- **GIVEN** an object property without a schema widget
- **WHEN** a field override names `widget: 'json'` for it
- **THEN** the form shows it
