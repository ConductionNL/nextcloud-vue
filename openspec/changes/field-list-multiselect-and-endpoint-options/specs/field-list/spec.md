# field-list

## ADDED Requirements

### Requirement: A field list edits list values with choices read from an endpoint

An add field of `type: "multiselect"` SHALL hold a list and SHALL save an emptied list as empty. An add field with `optionsSource` SHALL offer, after its static options, the items read from that endpoint as `{ value: valuePath, label: labelPath }`, each value once, with `@objectId` and `@object.<field>` filled in; a source that cannot be read SHALL leave the static options. A table column SHALL show a list value as its items joined, worded through `map` or the option labels of the add field it names in `labelsFrom`.

#### Scenario: The statuses of a rights row
- **GIVEN** a rights row with statuses `st-1` and `st-2`, and a statuses field whose source reads the case type's statuses
- **THEN** the table shows "Ontvangen, In behandeling"
- **AND** editing the row and clearing the statuses saves `statuses: []`
