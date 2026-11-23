# Proposal: the array-of-objects editor dossiq's status form needs

## Why

dossiq's status form edits two lists of small objects inside a status: `checklist[]` and `fieldRules[]`, each rule with an optional `condition`. The legacy tab did this by hand. `CnSubObjectsField` already edits such a list as a table with a row dialog, reorder and required checks, but it could not start a row with values, tidy rows on save, name rows for a screen reader, or edit an object that is either there or not.

## What changes

- `CnSubObjectsField` gains:
  - `newItem`: the values a new row starts with;
  - `itemLabel`: rows are named "Checklist item 2" in their actions and edit dialog;
  - `emptyText`;
  - focus that moves to the new row on add, and to the previous row or the add button on remove.
- `CnFormDialog` forwards `itemOverrides`, `newItem`, `itemLabel`, `emptyText` and `addLabel` from the field override.
  - `pruneWhen` tidies the rows on save: strings are trimmed, empty optional keys omitted, and rows dropped by `blank` keys or `invalid`. A row the save drops is not validated.
- `widget: 'object-switch'` edits an optional object: on fills `defaults`, off writes `null`. Its keys are fields at dotted paths, and a switched-off object saves as `null`.
- A select whose `optionsFrom` fails or gives nothing falls back to a text input.
- Manifest schema 2.131.0 documents the override keys.

## Depends on

This builds on `form-field-options-from` and `forms-dotted-path-fields`, which are merged into the branch.
