# index-page Delta: index-column-order-and-pinning

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-column-order-and-pinning](../../)

## Purpose

A user orders and pins the columns of a list, and the list remembers it
for them. Row `data-user-column-settings` (buildiq matrix).

## ADDED Requirements

### Requirement: A user orders the columns of a list

The Columns tab of `CnIndexSidebar` SHALL let the user move a visible
column up or down, by drag and by keyboard buttons that call the same
method. `CnDataTable` SHALL render the columns in that order. The table
header SHALL NOT be a drag target.

#### Scenario: A buyer puts the supplier first

- GIVEN a Purchase orders list with columns Number, Date, Supplier, Amount
- WHEN the buyer opens Search and columns and moves Supplier to the top
- THEN the table shows Supplier, Number, Date, Amount

#### Scenario: The same move from the keyboard

- GIVEN the Columns tab has focus on Supplier
- WHEN the user activates Move up twice
- THEN Supplier is the first column

### Requirement: A user pins columns to the start of the table

The Columns tab SHALL let the user pin columns. A pinned column SHALL
move into the pinned block at the start of the table, and the pinned
columns SHALL stay in view when the table scrolls sideways. When any
column is pinned, the selection column SHALL be pinned as well.

#### Scenario: The name stays in view

- GIVEN a list with twelve columns wider than the screen
- WHEN the user pins Name and scrolls the table to the right
- THEN Name and the selection boxes stay visible beside the scrolled columns

### Requirement: The column layout is kept per user and per list

The visible columns, their order and the pinned count SHALL be stored in
the user's Nextcloud preferences under a key per list, and SHALL be
restored when the user opens the list again on any device. A saved view
that carries columns SHALL win while it is applied. Reset columns SHALL
remove the stored layout and show the page's own columns. A page with
`config.personalColumns: false` SHALL NOT store a layout.

#### Scenario: The layout survives a reload

- GIVEN a user who moved Supplier first and pinned it
- WHEN she reloads the page the next day on another laptop
- THEN Supplier is first and pinned

#### Scenario: A saved view wins while applied

- GIVEN a user with a personal layout and a saved view "Late orders" carrying its own columns
- WHEN she applies "Late orders"
- THEN the table shows the view's columns
- AND clearing the view shows her personal layout again

#### Scenario: Reset returns to the page's columns

- GIVEN a user with a personal layout
- WHEN she chooses Reset columns
- THEN the table shows the page's columns in the page's order and nothing is pinned
