# action-dialog Delta: action-dialog-acts-and-sources

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [action-dialog-acts-and-sources](../../)

## Purpose

A manifest can configure a share-or-hand-over dialog, a lookup with grounds from the server and a split with exclusive
columns on `CnActionDialog`, without a hand-built dialog.

## ADDED Requirements

### Requirement: Each act posts to its own endpoint

With `confirm.requestsBy: { field, cases }` the dialog SHALL send the request that the chosen value of `field` names in
`cases`, with that request's `url` and `method`, and SHALL fall back to `confirm.request` when the value names none. The
confirm button SHALL read the chosen request's `label` when it has one. A body value that is exactly one `{fields.<name>}`
token SHALL send that field's value with its type kept. With `fieldsInBody: false` the dialog SHALL send the body alone.

#### Scenario: Board DqZaakSamenwerken "Overdragen"

- **GIVEN** a cards field `mode` with the cases `share` (POST to the shares url) and `handover` (PUT to the transfers url,
  `fieldsInBody: false`, body `{ targetOrganization: "{fields.organisation}" }`)
- **WHEN** the user chooses `handover`, picks an organisation and confirms
- **THEN** the dialog puts `{ targetOrganization: <the organisation's id> }` to the transfers url and posts nothing

### Requirement: A field shows only when another value says so

A field or the note with `visibleWhen` SHALL show only while its rule holds for another field's value (`field`) or a value
of the record (`path`): `equals`, `in`, `includes` or `filled`. A hidden field SHALL NOT be required and SHALL NOT be sent,
and a field whose rule reads a hidden field SHALL be hidden too. `note.textsBy: { field, cases }` SHALL give the note's text
per chosen value.

#### Scenario: Permission only for a share

- **GIVEN** a `permission` select with `visibleWhen: { field: "mode", equals: "share" }`
- **WHEN** the user chooses `handover`
- **THEN** the permission select is gone and the request carries no `permission`

### Requirement: A field reads its options from an endpoint

A select or checks field with `optionsSource` SHALL read its options from that endpoint source on open, keep the entries
whose fields equal `match`, take each value at `optionValue` and each label from the first `optionLabel` template that
fills. With `search: true` it SHALL read again with the typed term under `searchParam` once typing rests. A failed read
SHALL show `errorText`, or "The options could not be read.", and SHALL NOT pass for an empty list.

#### Scenario: Every partner organisation

- **GIVEN** an `optionsSource` answering three organisations, two of type `partner`, with `match: { type: "partner" }` and
  `optionLabel: ["{name} ({domain})", "{name}"]`
- **THEN** the select offers the two partners, one labelled with its domain and one without

#### Scenario: Grounds that cannot be read

- **GIVEN** an `optionsSource` whose read fails and `errorText` "The grounds could not be read."
- **THEN** that sentence shows under the field

### Requirement: Ticked can mean left out

A checks field with `sendUnticked: true` SHALL send the items left unticked rather than the ticked ones, and any field with
`sendAs` SHALL be sent under that key instead of its `field`.

#### Scenario: Fields a partner does not see

- **GIVEN** a checks field `shared` with `default: "all"`, `sendUnticked: true` and `sendAs: "fieldExclusions"`
- **WHEN** the user unticks "Status" and confirms
- **THEN** the request carries `fieldExclusions: ["status"]` and no `shared`

### Requirement: A checks field can tick in columns that exclude each other

A checks field with `columns: [{ field, label }]` SHALL draw a checkbox per column on every item, start with nothing ticked
and send each column as its own list under its `field`. With `exclusive: true` an item ticked in two columns SHALL show
`exclusiveText`, or "An item cannot be ticked in more than one column.", and SHALL keep the confirm off. `hideWhenEmpty`
SHALL hide a checks field without items. `requireOneOf` SHALL keep the confirm off until one of the named sent values
holds something. `source` SHALL read the record from an endpoint source.

#### Scenario: Board DqZaakDialogen "In tweeën splitsen"

- **GIVEN** a policy at `source` allowing only parties, and a party field with the columns "Moves" and "On both"
- **THEN** the documents section is hidden and the confirm is off
- **WHEN** the user ticks a party in both columns
- **THEN** the refusal line shows and the confirm stays off
- **WHEN** the user unticks "Moves" and confirms
- **THEN** the request carries `parties: []` and `partiesOnBoth: [<the party>]`
