## Why

A case type's rights rows (dossiq `case-type-rights-enforced`) hold lists: the actions, the statuses the edit rights hold in, the document rights. Their choices live in other records: the case type's statuses, the organisation roles and their departments. CnFieldListWidget's add form had text, select and checkbox fields with static options only, and its table showed a list value as nothing.

## What changes

- `add.fields[].type: "multiselect"`: an NcSelect with `multiple`, holding a list. An emptied list is saved as empty, so an edit can clear it.
- `add.fields[].optionsSource: { url, path?, valuePath?, labelPath? }`: options read from an endpoint after the static ones, each value once; tokens `@objectId` and `@object.<field>`. A source that cannot be read keeps the static options.
- Table columns word a list value as its items joined, each through `map` or, with `labelsFrom: "<add field key>"`, that field's option labels.

## Impact

No breaking change: a field without the new keys renders as before. First consumer: dossiq's case type Rights tab.
