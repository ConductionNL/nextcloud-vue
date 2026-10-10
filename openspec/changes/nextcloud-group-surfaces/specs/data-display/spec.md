# data-display Delta: nextcloud-group-surfaces

## ADDED Requirements

### Requirement: The inline editor picks a Nextcloud group or user

`CnObjectDataWidget` SHALL edit a field whose widget is `group` or
`group-multiselect` (a property marked `referenceType: nextcloud-group` or
`format: nc-group`, or an array of them) with a searchable list of Nextcloud
groups, and a field whose widget is `user` or `user-multiselect` with a
searchable list of Nextcloud users. The list SHALL show display names and the
widget SHALL store the group id or user id. The current value SHALL show its
display name when the editor opens, and SHALL fall back to the id when the
name cannot be found.

#### Scenario: A team field is picked by name

- **GIVEN** a schema property `assignedGroup` with `{ type: "string", referenceType: "nextcloud-group" }` and the object holds `behandelaars`
- **WHEN** the person clicks the field to edit it
- **THEN** the editor SHALL be a select whose options come from the group search
- **AND** choosing the option labelled "Toezicht" SHALL store `toezicht`

@e2e exclude Covered by the component test tests/components/CnObjectDataWidgetGroupUser.spec.js; the library's Playwright suite has no OpenRegister with seeded groups, and dossiq's e2e for its case page exercises the editor in a real instance.

#### Scenario: A user field is picked by name

- **GIVEN** a schema property `owner` with `{ type: "string", referenceType: "nextcloud-user" }`
- **WHEN** the person edits it
- **THEN** the editor SHALL be a user select whose options come from the user search and the stored value SHALL be the uid

@e2e exclude Covered by the component test tests/components/CnObjectDataWidgetGroupUser.spec.js; no seeded users in the library's Playwright suite.

### Requirement: A group cell shows the group's display name

`CnCellRenderer` SHALL render a value whose schema property is marked as a
Nextcloud group (`referenceType: nextcloud-group`, `format: nc-group`, or an
array whose `items` is) with the group's display name, and SHALL do the same
for a column that declares `widget: "group"`. The lookup SHALL be cached per
group id for the page, so one id is asked for once. Until the name is known,
and when it cannot be found, the cell SHALL show the id. A consumer-registered
cell widget and a column formatter SHALL still win.

#### Scenario: A Team column shows names

- **GIVEN** a CnDataTable over cases whose schema marks `assignedGroup` as a Nextcloud group
- **AND** two rows hold `toezicht`, whose display name is "Toezicht en handhaving"
- **THEN** both cells SHALL read "Toezicht en handhaving"
- **AND** the group lookup SHALL run once for `toezicht`

@e2e exclude Covered by tests/components/CnCellRendererGroup.spec.js and tests/utils/groupAutocomplete.spec.js; the name comes from a Nextcloud endpoint the library's Playwright suite does not serve.

#### Scenario: An unknown group shows its id

- **GIVEN** a cell holding `ghost` and a group lookup that finds nothing
- **THEN** the cell SHALL read `ghost`

@e2e exclude Covered by tests/components/CnCellRendererGroup.spec.js.
