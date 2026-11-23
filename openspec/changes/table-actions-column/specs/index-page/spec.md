# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [table-actions-column](../../)

## Purpose

A list can put the next step on every row.

## ADDED Requirements

### Requirement: A column can show row actions as buttons

A column with `widget: "actions"` SHALL show, on each row, the page's row actions named in `widgetProps.actions` that are
visible for the row, as buttons in that order. A click SHALL run the action as its row menu entry does and SHALL NOT open
the row. The column SHALL NOT sort.

#### Scenario: The postvak

- **GIVEN** row actions `link-case` ("Aan zaak koppelen") and `new-case` ("Nieuwe zaak") and a column
  `{ key: "do", widget: "actions", widgetProps: { actions: ["link-case", "new-case"] } }`
- **THEN** each message shows both buttons
- **AND** clicking "Aan zaak koppelen" runs that action for the message
