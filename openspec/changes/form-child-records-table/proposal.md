---
kind: code
depends_on: []
---

# Proposal: form-child-records-table

## Why

An order has order lines, a subsidy request has cost items, an
inspection has findings. Each line is its own record, with its own
schema and its own history. People want to type them where they type the
order: in the order form, as rows of a small table. In a Conduction app
they save the order, open it, find the lines widget, and add each line
through its own dialog.

The library has a table for arrays embedded in one object: the
`sub-objects` widget of `form-widgets-duration-and-subobject-table`. Its
design says outright that it is not for this: "When rows are their own
objects (`statusType` rows keyed to a case type), the object-list with
`object-list-create-with-initial-data` is the right tool. This widget is
for arrays embedded in one object." And the object-list is a widget on a
detail page, not a field in the form.

## Row

| matrix | row | name | own rating | built |
|---|---|---|---|---|
| buildiq | `form-subtable-children` | Edit a record's child records inside the parent form, as an editable sub-table. | no | none |

Built evidence: "nextcloud-vue v2.55.1 src/components/CnFormPage and
CnFormDialog: grep -iE 'subtable|sub-table|inline.?array' finds no
editable child-record table".

Demand: changelog, https://github.com/nocobase/nocobase/releases/tag/v2.0.0
("NocoBase 2.0.0, 2026-02-14").

## Competitor evidence, quoted from the buildiq matrix

- NocoBase, yes: "SubTableFieldModel/index.tsx:387 sub-table field model
  for one-to-many associations inside a form, plus popup sub-table",
  https://github.com/nocobase/nocobase (v2.2.18)
- Mendix, yes: "a data grid over an association inside the parent's data
  view, with Editable columns, lets users edit child records inline in
  the parent form", https://docs.mendix.com/refguide/columns/
- Microsoft Power Apps, yes: "the editable grid control makes a subgrid
  on a main form editable, so child rows are edited inline in the parent
  form",
  https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/make-grids-lists-editable-custom-control
- Budibase and Appsmith, partial: a picker, or an array the builder then
  writes to its own table.

## What changes

- A `child-records` form widget: an editable table of the records of
  another schema that point at this one, inside `CnFormDialog` and
  `CnFormPage`.
- The table offers Add row, inline editing of the columns it shows, a
  row dialog for the rest, and Remove.
- Rows are saved as their own objects when the parent is saved, with the
  reference to the parent set for them, and the form reports per row.
- It is selected from the schema when a property is an array of
  references with `inversedBy`, or by naming the widget.

## Affected projects

- `nextcloud-vue`: `CnFormDialog`, `CnFormPage`, a new
  `CnChildRecordsField`, `src/utils/schema.js`, a `useChildRecords`
  composable.
- Consumers: buildiq forms, shillinq (invoice lines), dossiq (case
  checklists), pipelinq (quote lines).

## Backward compatibility

An array of references keeps its current picker unless the property has
`inversedBy` and no explicit widget, or the field names `child-records`.
A form with no such property is unchanged.

## Cross-project dependencies

- OpenRegister's cascade for nested objects in a parent save is a stub:
  `RelationCascadeHandler::cascadeSingleObject()` logs "Cascade object
  creation not yet implemented in extracted handler" and returns null
  (`lib/Service/Object/SaveObject/RelationCascadeHandler.php:678-688` at
  `555af72`). So this change does not send children inside the parent's
  payload; it saves them through the child schema's own endpoint (see
  design D3). The stub is reported for the openregister lane: any client
  that sends nested children today loses them without an error.
