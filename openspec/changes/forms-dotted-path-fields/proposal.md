# Proposal: a form field can edit one key inside an object property

## Why

dossiq's case type keeps who handles a case in an object, `handling: { teams, deadline, ... }`. `fieldsFromSchema` left every `type: object` property out of a form unless the schema itself named a widget, so `handling.teams` could be neither shown nor edited from manifest config. A field override naming a widget did not bring the object back either.

## What changes

- A `fieldOverrides` key or an `includeFields` entry can be a dotted path (`handling.teams`). The field is built from the nested schema property, with its widget, and is required when its object's `required` lists it.
- CnFormDialog and CnObjectDataWidget read the value from inside the object and save the object with the edited key, keeping its other keys.
- An object property is kept when a field override names a `widget`, as it already was for a schema-level widget.

## Impact

Forms without dotted keys are unchanged.
