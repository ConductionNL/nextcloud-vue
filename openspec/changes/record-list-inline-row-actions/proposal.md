# Proposal: record-list-inline-row-actions

## Why

Board DqZaakBesluiten draws "Route van het besluit": the steps of a decision, dated, with "Goedkeuren" and "Afwijzen" on the
step that waits. `CnRecordListWidget` draws the steps with `dot`, `title` and `meta`, and has `rowAction` for one button and
`rowActions` for a menu, but two buttons on a row have no way in.

## What changes

- `rowActionsInline: true` draws `rowActions` as buttons on the row, with the same dispatch, `visibleWhen`, `endpoint` and
  `href` as the menu.
- An entry can take `variant` and an `ariaLabel` template.

Backward compatible: without the key the menu stays. Covers gap 7 of the dossiq component-gap audit (decision 281), in place
of the proposed `CnDecisionRouteWidget`. The mandate sentence is a `CnNoticeWidget` and the mandate facts a `CnFactsWidget`.
