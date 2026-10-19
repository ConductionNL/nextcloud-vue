# Proposal: a form select can read its options from a source

## Why

dossiq's IV3 taakveld picker chooses from the taakvelden register: about a hundred rows that change per year. A form field could list fixed options (`enum`), pick an object reference (`$ref`, storing a uuid) or a concept, but it could not offer the rows of a schema or an endpoint by a field of its own choosing, such as the taakveld code.

## What changes

- A form field can declare `optionsFrom`, in the field definition or in `fieldOverrides`; a register schema property can declare `x-options-from`, on itself or on its `items`. The shape is the one a dashboard page filter takes: `{ register, schema, filter? }` or `{ url, params?, responsePath? }`, with `valueField` and `labelField`.
- The field becomes a select, or a multiselect on an array field, in CnFormDialog, the schema-driven field list (`fieldsFromSchema`) and CnAdvancedFormDialog's Properties tab.
- The value stored is the option's value. A held value shows by its label. The source is read once per dialog, and typing filters those options.
- `utils/optionsFrom.js` holds the reader, so the page filter and the forms read one shape the same way.
- Manifest schema 2.130.0 declares `optionsFrom` on a field override (`$defs/optionsFrom`).

## Impact

Fields without `optionsFrom` are unchanged.
