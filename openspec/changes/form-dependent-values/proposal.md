# A field offers only the values its controlling field allows

## Why
OpenRegister refuses a save whose value is outside its `x-openregister-dependent-values` row, but CnFormDialog offered
every enum value, so the reader learned about the rule only from the refusal. stackiq's licence per licence type
(`landscape-dependent-field-options` task 3) needs the form to follow the table.

## What changes
CnFormDialog reads `x-openregister-dependent-values` on a property or its items. A static enum select or multiselect
offers only the row of the controlling field's value, every value when the table does not list that value. When the
controlling field changes, a value outside the new row is cleared (array entries are dropped). No schema change: the
annotation lives in the register schema, not in the manifest.
