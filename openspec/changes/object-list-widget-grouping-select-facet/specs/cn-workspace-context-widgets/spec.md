# cn-workspace-context-widgets Delta: object-list-widget-grouping-select-facet

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [object-list-widget-grouping-select-facet](../../)

## Purpose

Grow `CnObjectListWidget` to host dossiq's Documents tab
(`documents-on-the-case` task 2.2, Ruben's decision 2026-09-11 option b)
without removing any capability that tab currently ships: row grouping,
multi-select with bulk actions, interactive sort, a keyword-style facet
filter, and a click-to-upload button.

## ADDED Requirements

### Requirement: CnObjectListWidget groups rows by a field

Given `content.groupBy` naming a row field path, `CnObjectListWidget` SHALL
bucket the fetched (and facet-narrowed) rows into one heading and table per
distinct value at that path, in first-seen order. `content.groupLabel`
SHALL name the field path used for the heading text, defaulting to the raw
`groupBy` value when absent. A `groupBy` value that resolves to an object
(an `extend`-inlined reference) SHALL group by that object's `id`.

#### Scenario: Rows bucket by type

- **GIVEN** an object-list with `groupBy: "informatieobjecttype"` over rows `[{id:1,informatieobjecttype:"besluit"},{id:2,informatieobjecttype:"aanvraag"},{id:3,informatieobjecttype:"besluit"}]`
- **WHEN** the widget renders
- **THEN** two groups render, "besluit" holding rows 1 and 3 and "aanvraag" holding row 2, in that first-seen order

#### Scenario: An extend-inlined reference groups by id, not by its stringified form

- **GIVEN** `groupBy: "informatieobjecttype"`, `groupLabel: "informatieobjecttype.description"`, `extend: ["informatieobjecttype"]`, and two rows both carrying `informatieobjecttype: {id: "t1", description: "Besluit"}`
- **WHEN** the widget renders
- **THEN** exactly one group renders, keyed `t1` and labelled "Besluit", holding both rows

#### Scenario: No groupBy renders the ungrouped path

- **GIVEN** `content.groupBy` is absent
- **WHEN** the widget renders
- **THEN** rows render in a single table, unchanged from before this change

@e2e include On a case with documents of two informatieobjecttype values, open the Documents tab; assert two group headings render with the right documents under each.

### Requirement: CnObjectListWidget supports multi-select and bulk actions

Given `content.selectable: true`, `CnObjectListWidget` SHALL render
CnDataTable's checkbox column and track the selection. Given
`content.bulkActions` (the same action shape as `rowActions`), a bar
listing those actions SHALL render once at least one row is selected. A
`handler` bulk action SHALL receive the array of selected row objects
appended to its `args`; an `open-modal` bulk action SHALL receive the
selected ids as `props.selectedIds`. Dispatching a bulk action SHALL clear
the selection.

#### Scenario: Bulk bar appears only once something is selected

- **GIVEN** `selectable: true` and a `bulkActions` entry "Mark final"
- **WHEN** no row is selected
- **THEN** no bulk bar renders
- **WHEN** one row is selected
- **THEN** the bulk bar renders showing "1 selected" and a "Mark final" button

#### Scenario: A handler bulk action receives the selected rows, not just ids

- **GIVEN** two rows selected, `bulkActions: [{label: "Mark final", type: "handler", handler: "markFinal"}]`
- **WHEN** "Mark final" is clicked
- **THEN** the dispatched action's `args` carries the array of the two selected ROW OBJECTS
- **AND** the selection is cleared afterward

#### Scenario: An open-modal bulk action receives selectedIds as props

- **GIVEN** one row selected, `bulkActions: [{label: "Change confidentiality", type: "open-modal", target: "ConfidentialityDialog"}]`
- **WHEN** the action is clicked
- **THEN** the dispatched action's `props.selectedIds` carries the selected id(s)

@e2e include On the Documents tab, select two documents, click "Mark final" in the bulk bar; assert both documents transition and the selection clears.

### Requirement: CnObjectListWidget supports interactive column sort

Given `content.sortable` (`true` for every column, or an array of column
keys), the matching `CnDataTable` column headers SHALL become clickable to
sort, without overriding a column's own explicit `sortable: false`. A sort
click SHALL re-fetch with the new field's `_order`; a cleared sort (no
active key) SHALL re-fetch with no `_order` param.

#### Scenario: A header click changes the fetch order

- **GIVEN** `sortable: true`, `sort: {field: "creatiedatum", dir: "desc"}`, and a "Title" column
- **WHEN** the "Title" header is clicked (ascending)
- **THEN** the next fetch sends `_order[title]=asc` and no `_order[creatiedatum]`

#### Scenario: A cleared sort goes unordered

- **GIVEN** the "Title" column is actively sorted ascending
- **WHEN** the header is clicked again to clear it
- **THEN** the next fetch carries no `_order[title]` param

@e2e include On the Documents tab, click the Title column header; assert the row order changes and the request carries the new order.

### Requirement: CnObjectListWidget supports a facet filter

Given `content.facet: { field, label? }`, `CnObjectListWidget` SHALL render
one filter chip per distinct value of that field across the currently
loaded rows (flattening an array-valued field), and SHALL narrow the
rendered rows to those whose value at that field intersects the selected
chips (a row matches on ANY selected value, not all of them). A selection
matching zero rows SHALL render a distinct "no items match this filter"
state from the "no rows at all" empty state.

#### Scenario: Chips list the distinct values in use

- **GIVEN** `facet: {field: "keywords"}` over rows carrying `keywords: ["bezwaar","spoed"]`, `["bezwaar"]`, and `[]`
- **WHEN** the widget renders
- **THEN** two chips render: "bezwaar" and "spoed"

#### Scenario: A row matches on any selected keyword, not all of them

- **GIVEN** row A carries `keywords: ["bezwaar","spoed"]` and row B carries `keywords: ["spoed"]`, and "bezwaar" is selected
- **WHEN** the filter applies
- **THEN** row A is shown (it carries "bezwaar", even though it also carries "spoed") and row B is hidden

#### Scenario: No match shows the clear-filter state, not the no-rows state

- **GIVEN** rows are loaded and a facet value is selected that matches none of them
- **WHEN** the widget renders
- **THEN** a "No items match this filter" state with a "Clear filter" action renders, distinct from the empty-register state

@e2e include On the Documents tab, select a keyword chip that narrows to one document, then clear it; assert the full dossier returns.

### Requirement: A click-to-upload button rides the declared dropZone action

Given `content.dropZone`, `CnObjectListWidget` SHALL render a click-to-pick
upload button dispatching the SAME declared action a file drop would,
unless `content.upload` is `false`. No `dropZone` SHALL render no upload
button.

#### Scenario: The button dispatches the same action as a drop

- **GIVEN** `dropZone: {type: "handler", handler: "upload"}`
- **WHEN** the upload button's file picker returns files
- **THEN** the dispatched action carries those files, identically to a drop

#### Scenario: content.upload: false suppresses the button

- **GIVEN** `dropZone` is declared and `upload: false`
- **WHEN** the widget renders
- **THEN** no upload button renders (drag-and-drop still works)

@e2e include On the Documents tab, click Upload and pick a file; assert it uploads identically to a drag-and-drop.
