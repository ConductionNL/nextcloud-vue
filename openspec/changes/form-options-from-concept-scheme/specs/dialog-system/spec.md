# dialog-system Delta: form-options-from-concept-scheme

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [form-options-from-concept-scheme](../../)

## Purpose

`fieldsFromSchema` recognises a property bound to an OpenRegister
concept scheme, and `CnFormDialog` offers the options OpenRegister
serves for it. Answers buildiq
`data-field-types-and-choice-lists` (design, Risks). Rows
`data-choice-lists` and `data-field-types` (buildiq matrix).

## ADDED Requirements

### Requirement: A property bound to a concept scheme becomes a coded select field

`fieldsFromSchema` SHALL give a property carrying `conceptScheme` or
`x-openregister-concepts` the widget `select` and a `codeList` tag with
the property key, `multiple: false`, the `store` and the
`contextProperty` from `x-openregister-concepts` when present. An array
whose `items` carry the binding SHALL get the widget `multiselect` and
`multiple: true`. The function SHALL NOT make a request. A property
without a binding SHALL be derived exactly as before.

#### Scenario: A category bound by the simple spelling

- GIVEN a schema property `categorie` of type string with `conceptScheme: "woo-categorieen"`
- WHEN `fieldsFromSchema` runs
- THEN the `categorie` field has widget `select`
- AND `codeList` names property `categorie` with `multiple` false

#### Scenario: Several themes bound through the annotation

- GIVEN a property `themas` of type array whose items carry `x-openregister-concepts: { scheme: "https://example.org/thema", store: "notation" }`
- WHEN `fieldsFromSchema` runs
- THEN the `themas` field has widget `multiselect`
- AND `codeList` has `multiple` true and `store` "notation"

### Requirement: A coded field offers the options OpenRegister serves

For a field with a `codeList` tag, `CnFormDialog` SHALL request
`/index.php/apps/openregister/api/vocabulary/options` with the dialog's
schema, the property key and the user's language, SHALL offer the
returned options in their order with their labels, and SHALL store the
option's `value` as a string, or an array of strings for a multiselect.
When the request fails or returns nothing, the field SHALL fall back to
a text input with a line saying the list could not be loaded.

#### Scenario: A clerk picks a category

- GIVEN a publication schema whose `categorie` property is bound to the scheme "Woo-categorieën"
- WHEN a clerk opens the create dialog and opens the `categorie` select
- THEN it lists the scheme's current categories by their Dutch labels
- AND choosing "Klachten" stores that concept's uri in `categorie`

#### Scenario: The list cannot be loaded

- GIVEN the options request fails
- WHEN the clerk opens the create dialog
- THEN `categorie` is a text input with a line saying the list could not be loaded

### Requirement: A value no longer offered still shows by its label

When a record holds a coded value that is not among the options,
`CnFormDialog` SHALL resolve its label through OpenRegister's concept
resolution route, SHALL show it selected with a note that it is no
longer offered, and SHALL keep it until the user changes it.

#### Scenario: An old dossier keeps its retired category

- GIVEN a 2019 record whose `categorie` holds a category retired in 2024
- WHEN a clerk opens it for editing
- THEN `categorie` shows the retired category's label with "no longer offered"
- AND saving without touching it keeps the value

### Requirement: A context-bound field follows the field it depends on

When a coded field's binding names a `contextProperty`, `CnFormDialog`
SHALL send that field's current value as `context` and SHALL request the
options again whenever it changes. A chosen value that is not in the new
options SHALL be kept and marked as not offered for the new context.

#### Scenario: The category list follows the case type

- GIVEN `categorie` bound with `contextProperty: "zaaktype"`
- WHEN the clerk changes `zaaktype` from "Melding" to "Vergunning"
- THEN the `categorie` options are requested again with context "Vergunning"
- AND the select offers the categories for permits
