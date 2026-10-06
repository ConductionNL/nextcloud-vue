# schema-utilities: form pickers from schema keys

## ADDED Requirements

### Requirement: REQ-SU-PICK-001 Select or create a referenced object

A reference property with `x-allow-create: true` (on the property, or on `items` for an
array) SHALL render a picker that offers the existing objects and a "Create" option.
Choosing "Create" SHALL open the referenced schema's form in the same register,
prefilled with the typed term in the `x-label-field` property (default `name`).
Saving that form SHALL select the new object in the field that asked for it.

#### Scenario: Create a client from the contact form

- **GIVEN** a contact schema whose `client` property is `{ $ref: 'client', 'x-allow-create': true }`
- **WHEN** the user types "Acme" in Client and chooses Create
- **THEN** a create form for the client schema SHALL open with Name set to "Acme"
- **AND** saving it SHALL store the client and select it in the contact's Client field

#### Scenario: Closing the nested form changes nothing

- **GIVEN** the nested create form is open
- **WHEN** the user closes it without saving
- **THEN** the field SHALL keep its previous value

#### Scenario: Several references

- **GIVEN** an array property whose `items` carry `$ref` and `x-allow-create: true`
- **WHEN** the user creates an object from the picker
- **THEN** the new object SHALL be added to the selection

### Requirement: REQ-SU-PICK-002 Template copy and label field from schema keys

`fieldsFromSchema` SHALL map `x-fill-from` to `field.fillFrom` and `x-label-field` to
`field.reference.labelField`.

#### Scenario: x-fill-from is read

- **GIVEN** a reference property with `x-fill-from: { currency: 'defaultCurrency' }`
- **WHEN** `fieldsFromSchema` runs
- **THEN** the field SHALL carry `fillFrom: { currency: 'defaultCurrency' }`

### Requirement: REQ-SU-PICK-003 Related list create form resolves references

`CnObjectListWidget` SHALL pass its `register` to the create form, and SHALL seed and
lock the scalar filter values the list is scoped to.

#### Scenario: Product on a lead's product line

- **GIVEN** a related list of lead products filtered on `lead`
- **WHEN** the user opens Add
- **THEN** Product SHALL render as a searchable select of products, not a uuid box
- **AND** Lead SHALL be set to the current lead and read-only

### Requirement: REQ-SU-PICK-004 Group, language and time zone pickers

A property with `format: nc-group` or `referenceType: nextcloud-group` SHALL render a
searchable select of Nextcloud groups that stores the group id; an array of them SHALL
render a multi-select. `format: language` SHALL render a searchable select of languages,
labelled in the user's language and storing the language code. `format: timezone` SHALL
render a searchable select of IANA time zones. `format: nc-user` SHALL render the user
picker. Every select SHALL carry an `inputLabel`.

#### Scenario: Correspondence language

- **GIVEN** a property `{ format: 'language', 'x-default': 'current-language' }` and a Dutch user
- **WHEN** the user opens a create form
- **THEN** the field SHALL show "Nederlands" selected and store `nl`

#### Scenario: Language default fits the pattern

- **GIVEN** the user language `en_GB` and a pattern `^[a-z]{2}$`
- **WHEN** a new object is prefilled
- **THEN** the stored value SHALL be `en`

#### Scenario: Existing object keeps its value

- **GIVEN** an object with `correspondenceLanguage: 'fr'`
- **WHEN** the user edits it
- **THEN** the field SHALL stay `fr`

#### Scenario: Time zone default

- **GIVEN** a property `{ format: 'timezone', 'x-default': 'current-timezone' }`
- **WHEN** a new object form opens
- **THEN** the field SHALL hold the browser's time zone

### Requirement: REQ-SU-PICK-005 Help text behind the (i)

A property with `x-help` SHALL always show the (i) popover with that text, while
`description` stays the short helper line. Checkbox and switch fields SHALL render the
helper line and the (i) as other fields do.

#### Scenario: Is master record

- **GIVEN** a boolean property with `x-help`
- **WHEN** the form renders
- **THEN** the toggle SHALL show an (i) that opens the `x-help` text
