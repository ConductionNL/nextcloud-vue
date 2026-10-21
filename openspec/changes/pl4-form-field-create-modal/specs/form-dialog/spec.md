# form-dialog Delta: pl4-form-field-create-modal

**Status**: in-progress
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: A reference field can create through its own registry modal

A select-or-create reference field with `createModal` naming a `kind: 'modal'` registry entry SHALL mount that dialog's component on top of the form on Create (not in the app's single modal slot, so a form that is itself a registry modal stays open), with `initialData` holding the typed term in the label field and the field's `createModalProps`, each `@answer.<key>` replaced by that form value. The new object the dialog reports with `created` SHALL be selected in the field. A `close` without `created` SHALL leave the field as it was. A `createModal` that is not a registered modal SHALL be ignored.

#### Scenario: Creating a contact for the chosen client

- **GIVEN** a lead form whose client is `c-1` and whose contact field has `createModal: 'ContactCreateDialog'` and `createModalProps: { client: '@answer.client' }`
- **WHEN** the user types "Jan" in the contact picker and chooses Create
- **THEN** ContactCreateDialog opens with `client: 'c-1'` and `initialData: { name: 'Jan' }`
- **AND** the contact it creates is selected

### Requirement: A select-or-create picker can follow another answer

A select-or-create reference field with `pickerFilter` SHALL scope its options by those filters, each `@answer.<key>` replaced by that form value. An unanswered value SHALL scope to nothing.

#### Scenario: The contacts of the chosen client

- **GIVEN** a contact field with `pickerFilter: { client: '@answer.client' }`
- **WHEN** the user chooses client `c-1`
- **THEN** the contact picker is scoped to `{ client: 'c-1' }`

### Requirement: A field can show content under its control

A field with `hintWidget` naming a registered component SHALL show that component under its control, with the field, its value and every answer of the form as props. A host's `#field-{key}-hint` slot SHALL be shown instead when given. A name nothing answers to SHALL show nothing.

#### Scenario: A hint that follows the category

- **GIVEN** a category field with `hintWidget: 'CategoryRoutingHint'`
- **WHEN** the user enters "solar"
- **THEN** CategoryRoutingHint under the field receives `value: 'solar'`
