## Why

A contact's channels (emails, phones, social profiles) are a list in one field, edited one entry at a time, with one primary email and one primary phone, each address a `mailto:` or `tel:` link. CnFieldListWidget could add and remove entries but not edit one, had no switch field, and linked only http(s).

## What changes

- `edit`: an Edit button per row opens the form prefilled; the save replaces that entry with one PATCH.
- `add.fields[].type: "checkbox"`.
- `add.exclusive`: a flag only one entry holds.
- `row.href: { path, scheme }` for `mailto:` and `tel:`.

## Impact

No schema change. Builds on `feature/pl-abstract-pl1-field-list` (row links, lead, afterSave). First consumer: pipelinq ContactChannelsSection.
