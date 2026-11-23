# object-row Delta: index-row-list-cells

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-row-list-cells](../../)

## Purpose

Let an index page draw its rows as a headerless list with the cells a table would show.

## ADDED Requirements

### Requirement: A list row can carry leading and trailing cells

CnObjectRow SHALL draw `config.leading` (one cell) before the title and `config.trailing` (a cell or a list) after the badge, each `{ key, widget?, widgetProps?, formatter?, width? }` rendered by CnCellRenderer with the row as its row, so `age`, `badge` and `date` with `due` render as in a table column. `config.subtitleTemplate` SHALL fill the meta line from the row, an empty field taking its separator with it. Without these keys the row SHALL render as before.

#### Scenario: The team queue

- **GIVEN** a list view whose `listConfig` has `leading: { key: "createdAt", widget: "age" }` and `trailing: [{ key: "caseType", widget: "badge" }, { key: "deadline", widget: "date", widgetProps: { due: {} } }]`
- **WHEN** a case created six days ago renders
- **THEN** its row starts with "6 days" and ends with the case type badge and the due text, with no table header
