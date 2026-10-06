# schema-utilities: review round two

## ADDED Requirements

### Requirement: REQ-SU-R2-001 Picker widgets from a field override

A field override whose `widget` is `group`, `group-multiselect`, `user`,
`user-multiselect`, `language` or `timezone` SHALL render the same picker as the
schema format that triggers it. An override `x-default` SHALL prefill a new object
exactly as the schema key does.

#### Scenario: Group picker from a manifest override

- **GIVEN** a task schema whose `team` property is a plain string
- **AND** the page declares `fieldOverrides.team.widget: 'group'`
- **WHEN** the create form opens
- **THEN** Team SHALL be a searchable list of Nextcloud groups that stores the group id

#### Scenario: Language prefill from a manifest override

- **GIVEN** a client schema whose `language` property is a plain string
- **AND** the page declares `fieldOverrides.language: { widget: 'language', 'x-default': 'current-language' }`
- **WHEN** a user whose language is Dutch opens the create form
- **THEN** Language SHALL be a searchable language list with `nl` selected

#### Scenario: User picker from the schema format

- **GIVEN** a property with `format: 'user'`
- **WHEN** `fieldsFromSchema` runs
- **THEN** the field SHALL be a user picker

### Requirement: REQ-SU-R2-002 fkResolve uses the schema slug exactly as given

The `fkResolve` cell SHALL look up the referenced object under the schema slug the
column names, without changing its case or adding dashes.

#### Scenario: camelCase slug

- **GIVEN** a column `{ widget: 'fkResolve', widgetProps: { register: 'pipelinq', schema: 'productCategory' } }`
- **WHEN** the cell resolves a uuid
- **THEN** it SHALL fetch from `pipelinq/productCategory`, not `pipelinq/product-category`

### Requirement: REQ-SU-R2-003 Create from a picker uses the app's own create dialog

When a select-or-create picker creates an object of a schema for which the app has
registered a create dialog or create override, the picker SHALL open that instead of
the generic form. Without one it SHALL open the generic form as before.

#### Scenario: App create override exists

- **GIVEN** pipelinq's clients page declares `createOverride: 'createClientContactAware'` for schema `client`
- **WHEN** the user chooses Create in a contact's Client picker and saves the form
- **THEN** the form data SHALL be saved through that handler, not a plain object save
- **AND** the client it returns SHALL be selected

#### Scenario: Only an app dialog exists

- **GIVEN** a page declares `createModal: 'ClientCreateDialog'` for schema `client` and no create override
- **WHEN** the user chooses Create in a Client picker
- **THEN** `ClientCreateDialog` SHALL open with the typed term as initial data
- **AND** the client it reports with its `created` event SHALL be selected

#### Scenario: No app dialog

- **GIVEN** no page or override names a create dialog for schema `tag`
- **WHEN** the user chooses Create in a Tag picker
- **THEN** the generic nested form SHALL open
