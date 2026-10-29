# expandable-row-table-tools

## ADDED Requirements

### Requirement: An expandable row's sub-table sorts and filters on its headers

When the layout sets `table.sortable`, each column header MUST be a button that sorts the entries ascending, then descending, then back to the list order, and the header MUST carry `aria-sort` while it sorts. When the layout sets `table.filterable`, each column header MUST have a filter button that lists the values the column holds; the table MUST show only entries whose value is checked. An order column MUST keep each entry's own position number while sorted or filtered.

#### Scenario: sort the stages by name

- GIVEN the Verkoop pipeline open with `table.sortable`
- WHEN the user clicks the Fase header
- THEN the stages show in name order and the header reads `aria-sort="ascending"`
- AND each stage keeps its own order number

#### Scenario: filter the stages on Gesloten

- GIVEN the Verkoop pipeline open with `table.filterable`
- WHEN the user opens "Filteren op Gesloten" and checks "Ja"
- THEN only the closed stages show

### Requirement: An expandable row's entries can be reordered

When the layout sets `table.reorder`, each entry MUST have a drag handle. Dragging an entry onto another, or ArrowUp / ArrowDown on its handle, MUST emit the list in its new order with `reorder.key` (default `order`) renumbered from 1. Moving MUST be off while the table is sorted or filtered. CnIndexPage MUST save the row with the reordered list through its store and reload the list.

#### Scenario: move a stage down

- GIVEN the Verkoop pipeline open with `table.reorder`
- WHEN the user presses ArrowDown on the handle of the first stage
- THEN the pipeline is saved with that stage second and the orders renumbered 1, 2, 3 ...
