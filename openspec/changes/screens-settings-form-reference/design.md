# Design: screens-settings-form-reference

- Field: `{ key, type: "reference", register, schema, labelField?, filter?, limit?, emptyLabel?, valueTemplate? }`.
- One list read per reference field when the form is created: the objects of register and schema, `filter` as query
  parameters, at most `limit` (100).
- The choice is a native select, as the form's `select` type: "None" (left out when required), then the objects by
  `labelField`, else title, else name, else id.
- The stored value is a string: `valueTemplate` filled with `{id}`, `{register}`, `{schema}` and the chosen object's
  fields; without a template the id.
- A stored value that is none of the objects (a URL typed earlier) is listed as it is, so opening the form and saving
  never changes it.
- A failed read shows a message under the field and keeps the stored value.
- Part of the one Save and the changed-fields diff; "None" is written as null.
- Not covered: searching a list longer than `limit`, and a preview of the chosen object.
