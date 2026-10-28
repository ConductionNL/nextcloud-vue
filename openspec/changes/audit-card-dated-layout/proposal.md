# Proposal: audit-card-dated-layout

## Why

Board PqJourney draws the side card "Geschiedenis" as a short two-column list: the date ("2 okt") on the left, what
happened on the right ("Geactiveerd door Pieter Jansen", "Flow samengesteld", "Aangemaakt"). The audit card draws a row
per entry with the moment beside the action and who under it (default) or under it (`stacked`).

## What changes

- `layout: "dated"` on the audit card and the `audit-trail` widget: a two-column list, the board's short date beside the
  action's words. Who shows only where the action's label names them (`{actor}`).

Without the key nothing changes. No schema change.
