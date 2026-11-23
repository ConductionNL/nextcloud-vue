# Form pattern message

## Why

An app's own create form says what a wrong value is ("Invalid email format", "Invalid phone format"). CnFormDialog only says "Invalid format.", so moving such a form onto CnFormDialog (pipelinq's client form, shared with dossiq as open-form config) would lose those words.

## What changes

- `validation.patternMessage` on a field replaces "Invalid format.", translated through the host app.
- `fieldOverrides[key].hidden: false` puts a `visible: false` property on a form, as it already does for a tenant property.
