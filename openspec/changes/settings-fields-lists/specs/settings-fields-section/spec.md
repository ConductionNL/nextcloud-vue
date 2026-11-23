# settings-fields-section Delta: settings-fields-lists

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [settings-fields-lists](../../)

## Purpose

A settings field can hold a list of choices, key-to-value rows, or one key of a JSON setting, and a section can be scoped by one field's value.

## ADDED Requirements

### Requirement: A field can hold several values

A `checkboxes` field SHALL draw its `options` as checkboxes in a fieldset whose legend is the label, and its value SHALL be the list of checked values in option order. A `select` with `multiple: true` SHALL be a multi-select with the same value. The value SHALL be read from a list, a JSON list or comma text, and saved as a list, or as JSON text with `saveAs: 'json'` or comma text with `saveAs: 'csv'`. A required multi-choice field with nothing chosen SHALL be refused.

#### Scenario: Choosing the search fields

- **GIVEN** a checkboxes field searchFields with name, email and phone, stored as `['email']`
- **WHEN** the administrator also checks name and saves
- **THEN** the section sends `searchFields: ['name', 'email']`

### Requirement: A field can hold key-to-value rows

A `pairs` field SHALL draw one row per stored key, each with a labelled key input, a labelled value input (a number input with `valueType: 'number'`) and a remove button named after the row's key, and an add button under the rows. It SHALL save the rows with a key as one object, or as JSON text with `saveAs: 'json'`, and refuse two rows with the same key with "<label> holds <key> twice.", a key that fails `pattern` with `patternMessage`, and with `valueAbove` a value that is not above it with `valueMessage`.

#### Scenario: Adding an exchange rate

- **GIVEN** rates stored as `{ USD: 0.92 }`
- **WHEN** the administrator adds a row GBP 1.17 and saves
- **THEN** the section sends `rates: { USD: 0.92, GBP: 1.17 }`

### Requirement: A field can edit one key of a JSON setting

A field with `path: '<setting>.<key>'` SHALL read `<key>` inside the setting `<setting>` (an object, or JSON text), and a save SHALL send `<setting>` whole: the value read, with every field of the section whose path lies in it set from the form, as JSON text when it was read as text.

#### Scenario: Changing the low VAT rate

- **GIVEN** `vat_rates` stored as `{"high":21,"low":9,"extra":5}` and fields for high, low and zero (default 0)
- **WHEN** the administrator sets low to 6 and saves
- **THEN** the section sends `vat_rates` as `{"high":21,"low":6,"extra":5,"zero":0}`

### Requirement: A scope field fills the url

A field with `scope: true` SHALL take its `default` until changed, fill `{key}` tokens in the section's `url` and `saveUrl` and in the fields' `url`, `saveUrl` and action urls, and read the section again when it changes. It SHALL never be saved and never make the section dirty.

#### Scenario: Switching tenant

- **GIVEN** url `/apps/myapp/api/tenant-config?tenantId={tenantId}` and a scope select tenantId defaulting to t1
- **WHEN** the administrator picks t2
- **THEN** the section reads `...tenantId=t2` and a save goes to that url

### Requirement: An action says what its answer means

When an action's answer has no sentence at `resultPath`, the section SHALL show `successText`, or `failureText` when `okPath` reads false, with `{name}` filled from the answer.

#### Scenario: Testing a connection that answers a flag

- **GIVEN** an action with `okPath: 'available'`, `successText: 'Reachable at {baseUrl}.'` and `failureText: 'Not reachable.'`
- **WHEN** the endpoint answers `{ available: false }`
- **THEN** the section shows "Not reachable." as an error
