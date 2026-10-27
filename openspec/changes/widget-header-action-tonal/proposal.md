# Proposal: widget-header-action-tonal

## Why

Board PqLoyaliteit draws three things a dashboard could not give the loyalty reporting page:

- The tier card's "Exporteren als CSV" is a pill in the card's title row: tonal blue, no frame, fully rounded, with an
  icon. A widget header action drew it as an outlined button (COMPDIFF pl2 `pill "Exporteren als CSV": borderRadius 17>8, border 0>1`).
- That export reads the page's programme and period, but a widget header action on a dashboard resolved only the
  record tokens, so `@workspace.<key>` stayed in its url.
- The eight KPI tiles sit in two rows of four. The KPI row was always an auto-fit grid of 200px columns, which puts
  five tiles in a row at the board's width.

## What changes

- A widget header action may set `variant: "tonal"`: a pill button (34px high, radius 17, the primary light
  background and its text colour, 13px semibold, icon before the label) that runs its action.
- On a dashboard, a widget header action resolves `@workspace.<key>` tokens from the page filters, and its dispatch
  receives the token context, so an api-call fills them in its url.
- A dashboard's `config.kpiColumns` (2, 3 or 4, default `"auto"`) sets the KPI row's columns.

## Scope

`resolveWidgetHeaderActions`, `CnWidgetHeaderActionButtons`, `CnDashboardPage` and the v2 manifest schema
(`kpiColumns`). Other hosts of widget header actions do not pass page filters and are unchanged.
