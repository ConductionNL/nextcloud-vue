# schema-utilities: nested create uses the page config

## MODIFIED Requirements

### Requirement: REQ-SU-R2-003 Create from a picker uses the app's own create dialog

When a select-or-create picker creates an object of a schema for which the app has
registered a create dialog or create override on the index page that lists the schema,
the picker SHALL use that instead of the generic save. The page SHALL be found whether
the reference names the schema by slug, id or uuid.

#### Scenario: Reference by schema id, page by slug

- **GIVEN** pipelinq's contact schema stores `client: { $ref: 28 }`
- **AND** the Clients page declares `schema: 'client'` and `createOverride: 'createClientContactAware'`
- **AND** schema 28 has slug `client`
- **WHEN** the user chooses Create in a contact's Client picker and saves the form
- **THEN** the object is saved through `createClientContactAware`
- **AND** no plain object save is made

#### Scenario: Create modal for a reference by id

- **GIVEN** the Clients page declares `createModal: 'ClientCreateDialog'` and no create override
- **AND** the contact schema references the client schema by id
- **WHEN** the user chooses Create in the Client picker
- **THEN** the app's `ClientCreateDialog` opens with the typed term as initial data

## ADDED Requirements

### Requirement: REQ-SU-NC-001 The nested create form is the page's create form

The nested create form SHALL use the `excludeFields`, `includeFields`, `fieldOverrides`,
`formSize` and `formColumns` of the index page that lists the referenced schema, and
SHALL put the typed term in the reference's label field, or else in the schema's `name`,
`title` or `label`.

#### Scenario: Read-only name made editable by the page

- **GIVEN** the client schema's `name` is `readOnly`
- **AND** the Clients page declares `fieldOverrides: { name: { readOnly: false }, correspondenceLanguage: { widget: 'language' }, timezone: { widget: 'timezone' } }`
- **WHEN** the user types "Lane BV" in the Client picker and chooses Create
- **THEN** the nested form shows an editable Name field holding "Lane BV"
- **AND** Correspondence language and Timezone are pickers

#### Scenario: Page field selection and layout

- **GIVEN** the Clients page declares `excludeFields: ['industry']`, `formSize: 'large'` and `formColumns: 2`
- **WHEN** the nested create form opens for a client
- **THEN** it has no Industry field, is large and has two columns

#### Scenario: No page lists the schema

- **GIVEN** no manifest page lists the referenced schema
- **WHEN** the user chooses Create in the picker
- **THEN** the generic form opens with the form defaults and saves with a plain object save
