# A side card follows the selected row of a list

## Why

Board DqZaaktypeVelden draws a side card "Keuzelijst: Soort bouwwerk". It
lists the options of the field selected in the Velden table and has an
"Optie toevoegen" button. Those options are stored on the selected field's
own record, not on the record the page shows. No side card could show
another record than the page's, so the only way to build this was a custom
card, and pages are config over abstract widgets.

## What changes

- **A list publishes its rows.** An `object-list` with
  `content.rowSelection: true` publishes the rows it shows and the row the
  reader clicked on, under its widget id. CnDetailPage provides the selection
  store (`cnWidgetSelection`). The selected row is marked.
- **A side card follows that list.** A side-column widget with
  `follows: { widget, register, schema, when? }` is hosted on the followed
  row:
  - its record, id, register and schema are that row's, so an editing
    widget (a `field-list`) saves to that row;
  - `{field}` placeholders in its title are filled from the row;
  - it shows the selected row when `when` holds for it, else, while nothing
    is selected, the first row for which `when` holds;
  - it draws nothing when there is no such row.
- **A field list adds plain values.** `add.scalar: true` adds the value of
  the first add field itself, for a list of strings such as `enumValues`.
