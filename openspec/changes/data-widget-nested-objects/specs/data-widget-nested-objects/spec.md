# data-widget-nested-objects Delta

## Purpose

A nested object in the data widget reads as words a person can follow, and is never overwritten by the inline text editor.

## ADDED Requirements

### Requirement: A nested object reads as a list per key

`CnObjectDataWidget` SHALL render a plain-object value as a definition list, and an entry whose value is itself a plain object as a nested definition list. Below that second level a value SHALL render as compact JSON. A string SHALL keep its line breaks, and a list of scalars SHALL read as one comma-separated line. A nested key SHALL be labelled with its sub-schema `title`, passed through `cnTranslate`, when the schema has one; otherwise an identifier-shaped key (camelCase, snake_case, kebab-case) SHALL be made readable with `humaniseKey`, and any other key SHALL show as written.

#### Scenario: A per-language map

- **GIVEN** a field `description` holding `{ nl: { shortDescription: "Kort", longDescription: "Regel 1\n\nRegel 2", features: ["Kaart", "Foto"] } }`
- **WHEN** the widget renders it
- **THEN** it shows a list with the key `nl` and, under it, "Short description" reading "Kort", "Long description" with both paragraphs, and `features` reading "Kaart, Foto"
- **AND** no compact JSON appears for it
- @e2e exclude a pure rendering mapping, covered by `tests/components/CnObjectDataWidgetNestedObjects.spec.js`

#### Scenario: A sub-schema title labels the key

- **GIVEN** the schema gives `description.additionalProperties.properties.shortDescription` the title "Short text"
- **WHEN** the widget renders the per-language map
- **THEN** that nested key reads "Short text", `longDescription` reads "Long description" and `nl` stays `nl`
- @e2e exclude a pure label lookup, covered by `tests/components/CnObjectDataWidgetNestedObjects.spec.js`

### Requirement: A structured value is never edited inline

`CnObjectDataWidget` SHALL NOT make a field inline-editable when its widget is `json`, `code`, `file`, `sub-objects` or `child-records`, when its schema types it as a list of objects, or when its value is a plain object or a list holding a plain object, unless the field is a relation. This SHALL hold while the value is empty, behind a formatter, and over an `overrides.<key>.editable: true`. A consumer that supplies a `field-<key>` slot SHALL keep inline editing for that field.

#### Scenario: An object value has no inline editor

- **GIVEN** an editable widget with a field holding a plain object
- **WHEN** a person clicks the value or presses Enter on it
- **THEN** no inline editor opens and the value is not committed as `"[object Object]"`
- @e2e exclude an editability guard, covered by `tests/components/CnObjectDataWidgetNestedObjects.spec.js`

#### Scenario: A consumer slot keeps the field editable

- **GIVEN** the same field and a `field-<key>` slot
- **WHEN** the widget renders
- **THEN** the field is inline-editable
- @e2e exclude an editability guard, covered by `tests/components/CnObjectDataWidgetNestedObjects.spec.js`
