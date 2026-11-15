# A transition input can name a sub-field by a dotted path

## Why
learniq's "Record municipality feedback" asks the MAS route (required) and a note, both inside the flag's
`municipalityFeedback` object (`attendance-flag-report-actions` task 1.3). An object input narrowed with `fields` draws
the two sub-fields, but cannot make one of them required without marking it required in the schema, which binds every
save.

## What changes
`normaliseInputs` folds the inputs on a dotted field (`parent.child`) into one object input on the parent, in the place
of the first, asking those sub-fields in order. Each sub-field is required and labelled as its own input says. Values,
completeness and the sent object follow the object-input rules already in place. No schema change.
