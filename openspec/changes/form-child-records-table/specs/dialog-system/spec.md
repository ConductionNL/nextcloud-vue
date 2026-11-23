# dialog-system Delta: form-child-records-table

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [form-child-records-table](../../)

## Purpose

A parent form edits its child records as an editable table, and the
children are saved as their own objects. Row `form-subtable-children`
(buildiq matrix).

## ADDED Requirements

### Requirement: A child-records field edits another schema's records inside the form

`CnFormDialog` and `CnFormPage` SHALL render a `child-records` field for
a property that is an array of references carrying `inversedBy`, or for a
field naming the widget with its `schema` and `parentField`. The field
SHALL show the children as a table with Add row, inline editing of its
columns, a row dialog for the other fields, and Remove. On an existing
parent it SHALL load the children whose `parentField` names the parent.

#### Scenario: An order with its lines

- GIVEN an Order schema whose `lines` property references OrderLine with `inversedBy: "order"`
- WHEN a buyer opens New order, adds three lines in the table and submits
- THEN the order is saved
- AND three OrderLine records exist, each pointing at the order

#### Scenario: Editing a line of an existing order

- GIVEN an existing order with three lines
- WHEN the buyer opens it, changes the quantity on line 2 and removes line 3
- THEN after saving, line 2 has the new quantity and line 3 no longer exists

### Requirement: Children are saved after the parent in two requests

After the parent is saved, the form SHALL send every new and changed
child in one bulk save to the child schema with the reference to the
parent set, and every removed child in one bulk delete. A child that is
not saved SHALL be named in the result with the reason, and the parent
SHALL stay saved. The form SHALL NOT send children nested in the
parent's payload.

#### Scenario: One line refused

- GIVEN the buyer may not write one of the lines
- WHEN she saves the order
- THEN the order is saved and the result names that line as not saved, with the reason

### Requirement: Rows are validated before anything is sent

Each row SHALL be checked against the child schema's required fields and
constraints before the parent is saved. A failing row SHALL block the
submit and SHALL name its row number and field.

#### Scenario: A line without a product

- GIVEN line 2 has no product while Product is required on OrderLine
- WHEN the buyer submits
- THEN nothing is saved and the form says row 2 needs a product
