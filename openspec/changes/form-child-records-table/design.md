# Design: form-child-records-table

Read at nextcloud-vue development `c8aa85863` and openregister development
`555af72`.

## What is there

- `form-widgets-duration-and-subobject-table` (open, unimplemented)
  specifies `sub-objects` for arrays embedded in one object, with a row
  table, Add, Edit, Duplicate, Move and Remove, and a nested
  `CnFormDialog` per row.
- `CnObjectListWidget` lists related objects on a detail page, and
  `object-list-create-with-initial-data` (open) prefills a new child with
  the parent. Neither is a form field.
- OpenRegister: a property with `$ref` and `inversedBy` describes the
  child side of a one-to-many relation. A single save creates nested
  children for such a property (`SaveObject::cascadeObjects()`,
  `lib/Service/Object/SaveObject.php:2085`); the bulk save path does not
  cascade (`lib/Service/Object/SaveObjects.php:2659`, a TODO).
  `POST /api/bulk/{register}/{schema}/save` saves many objects of one
  schema in one request (`appinfo/routes.php:1285`), and
  `POST /api/bulk/{register}/{schema}/delete` deletes many (`:1286`).

## Decisions

### D1. Selected from the relation, not guessed from the shape

`fieldsFromSchema` gives a property the `child-records` widget when it is
an array whose items carry a `$ref` and the property carries
`inversedBy` (the child's property that points back), unless the
property or the field names another widget. The child schema comes from
`$ref`, the back-reference from `inversedBy`. A manifest field may name
the widget and supply `schema`, `parentField` and `columns` itself when
the relation is not declared on the parent.

### D2. Reuse the sub-objects table, change what a row is

The table, the row dialog and the keyboard behaviour are the ones
`sub-objects` specifies, so the two widgets look and work alike. What
differs is the row: a child record with an id once saved, loaded from
OpenRegister with `parentField = <this object's id>` when the form opens
on an existing record. `columns` (default: the child schema's first four
required properties) are editable in the cell; the rest open in the row
dialog.

### D3. Children are saved after the parent, in two requests

On submit the form saves the parent first. Then it sends every new and
changed child in one `bulk save` to the child schema, with `parentField`
set to the parent's id, and every removed child in one `bulk delete`.
The result phase lists children not saved, with the reason, and keeps
the parent saved.

Rejected: nested children in the parent payload. A single save creates
new nested children, but nothing establishes that it updates a changed
child or removes one the user deleted, and a form that edits an existing
order needs all three. Saving the children as their own objects needs no
cascade. If OpenRegister specifies update and removal on the nested
path, this can become one request; the field's contract does not
change.

Rejected: one request per row. A thirty-line invoice is thirty requests
and thirty chances to stop half way.

### D4. Validation per row before anything is sent

Each row is validated against the child schema's `required` and
constraints before the parent is saved. A row that fails blocks the
submit and names the row number and the field, the rule `sub-objects`
already sets.

## Files

- `src/components/CnChildRecordsField/`: new, table plus row dialog.
- `src/composables/useChildRecords.js`: new; load, diff, bulk save,
  bulk delete.
- `src/utils/schema.js`: the widget from `inversedBy`.
- `src/components/CnFormDialog/CnFormDialog.vue`,
  `src/components/CnFormPage/CnFormPage.vue`: save children after the
  parent.

## Risks

- [A child schema the user may not write] -> the bulk save refuses those
  rows; the result names them, and the parent stays saved.
- [Hundreds of children] -> the field pages at 50 rows and says how many
  there are; editing hundreds of rows belongs on a list page, and the
  field links to it.
