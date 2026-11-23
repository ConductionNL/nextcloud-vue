# manifest-detail-lifecycle-actions Delta: transition-input-reference-and-subfields

## ADDED Requirements

### Requirement: A reference input is picked, never typed

`CnTransitionInputDialog` SHALL render an input whose schema property
resolves to an object reference (`$ref`) with `CnResourceSelect` over the
referenced schema, and SHALL send the picked object's uuid as the input's
value. An input entry MAY carry `picker` with `filter` (field values the
candidates must match), `excludeSelf` (drop the record the transition runs
on) and `labelField`. `CnResourceSelect` SHALL accept `filter` (default
`{}`) and `exclude` (default `[]`) props to support this.

#### Scenario: Merging a duplicate learner

- **GIVEN** a LearnerProfile detail page with a manifest transition `merge` whose input is `{field: "mergedInto", required: true, picker: {filter: {lifecycle: "active"}, excludeSelf: true}}` and `mergedInto` declared `format: uuid`, `$ref: LearnerProfile`
- **WHEN** the user chooses Merge into another account
- **THEN** the dialog SHALL render a record picker over learner profiles, not a text field
- **AND** its list request SHALL carry `lifecycle=active` and the current profile SHALL NOT be offered
- **AND** confirming SHALL send `data: {mergedInto: "<picked uuid>"}`

#### Scenario: Nothing picked, nothing sent

- **GIVEN** the same required input
- **WHEN** no record is picked
- **THEN** the confirm button SHALL be disabled

#### Scenario: A plain text input is unchanged

- **GIVEN** an input whose property is a string without `$ref`
- **WHEN** the dialog opens
- **THEN** it SHALL render a text field as today

@e2e include On a detail page with a merge transition, open the dialog; assert a record picker without the current record; pick one; confirm; assert the transition request carries the picked uuid.

### Requirement: An object input can be filled one field at a time

An input whose schema property is `type: object` SHALL render its
sub-properties as fields. An input entry MAY carry `fields`, a list of
sub-property names; then only those SHALL render. On confirm the dialog
SHALL send the input as one object: the record's current value of that
property (or `{}`) with the typed sub-values merged over it. The dialog
SHALL NOT send dotted keys.

#### Scenario: Recording the municipality's answer

- **GIVEN** an attendance flag in state `reported` whose `municipalityFeedback` is `{receivedAt: null, recordedBy: null}`, and the hint `inputs: {recordMunicipalityFeedback: [{field: "municipalityFeedback", fields: ["masRoute", "note"]}]}`
- **WHEN** the user chooses Record the municipality's answer
- **THEN** the dialog SHALL show MAS route and Note only
- **AND** confirming with "Route B" and "Called on Monday" SHALL send `data: {municipalityFeedback: {receivedAt: null, recordedBy: null, masRoute: "Route B", note: "Called on Monday"}}`

#### Scenario: Without a fields list every sub-property shows

- **GIVEN** an object input without `fields`
- **WHEN** the dialog opens
- **THEN** every sub-property of the object SHALL render

### Requirement: Input hints apply to server-declared transitions

`CnDetailPage` SHALL accept `config.lifecycleActions.inputs`, a map of
action name to a list of `{field, picker?, fields?}`, and SHALL merge each
entry onto the server-declared input with the same `field` before the dialog
opens. A hint whose `field` the server does not declare SHALL be ignored with
one console warning and SHALL NOT add an input. The v2 manifest schema SHALL
accept the key.

#### Scenario: A hint for an undeclared field

- **GIVEN** a hint for field `extra` on an action whose server inputs are `[{field: "municipalityFeedback"}]`
- **WHEN** the dialog opens
- **THEN** only the municipalityFeedback input SHALL render and one warning naming `extra` SHALL be logged
