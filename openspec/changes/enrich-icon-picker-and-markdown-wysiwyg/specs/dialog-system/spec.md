## ADDED Requirements

### Requirement: REQ-DG-010 — Schema-driven icon field widget

`CnFormDialog` SHALL render a field as an icon picker when its field definition declares `widget: 'icon'`. The dialog SHALL mount `CnIconPicker` bound to the field's value in `formData` and SHALL forward the field's icon configuration — `iconSources` → the picker's `sources`, plus `allowCustomSvg`, `catalogues`, and `searchable` when present. The addition SHALL be purely additive: fields without `widget: 'icon'` are unaffected.

#### Scenario: Icon widget renders the picker
- **GIVEN** a `CnFormDialog` field definition with `{ key: 'icon', widget: 'icon', iconSources: ['mdi','fontawesome'] }`
- **WHEN** the dialog renders that field
- **THEN** a `CnIconPicker` is mounted with `sources` equal to `['mdi','fontawesome']`
- **AND** the picker is bound to `formData.icon`

#### Scenario: Selecting an icon updates form data
- **GIVEN** a rendered `widget: 'icon'` field
- **WHEN** the user selects an icon in the picker
- **THEN** `formData` for that field key holds the selected icon value
- **AND** confirming the dialog emits the icon value in the create/edit payload

#### Scenario: Custom SVG forwarded through the field definition
- **GIVEN** a field definition with `{ widget: 'icon', allowCustomSvg: true }`
- **WHEN** the dialog renders that field
- **THEN** the mounted `CnIconPicker` has custom-SVG authoring enabled
