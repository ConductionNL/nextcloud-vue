# Proposal: table-actions-column

## Why

DqPostvak draws two buttons on every message, "Aan zaak koppelen" and "Nieuwe zaak", in a "Doen" column. A list could
only offer row actions in the row menu.

## What changes

- A column with `widget: "actions"` and `widgetProps.actions: [<id or label>, ...]` shows those of the page's row actions
  as inline buttons, in that order, only where the action is visible for the row (`visible`, a locally decidable
  `visibleWhen`). The first is secondary, the rest tertiary, unless an action sets `variant`.
- A click runs the action's handler and emits the same `action` event a row menu entry emits, without opening the row.
- The column does not sort. CnCellRenderer gets the `actions` widget; CnIndexPage resolves its buttons. No schema
  change: column widgets are free-form.
