# Proposal: board-tabs-overflow-in-actions

## Why

Boards DqZaakMeer and DqZaakBesluiten draw five case tabs (Overzicht, Bestanden, Contact, Taken, Historie) and list
the other eight panels at the top of the "Acties" menu at the end of the strip. In the board look CnTabsWidget put
every tab in the strip and ignored `overflow` and `maxVisibleTabs`, so a case with thirteen panels drew thirteen tabs.

## What changes

- In the board look CnTabsWidget honours `overflow: true`, `maxVisibleTabs` and `hideEmpty` again. The activity
  (History) tab always stays in the strip and holds one of the `maxVisibleTabs` places.
- The tabs that are not in the strip are listed at the top of the strip's Actions menu, not under a separate "More"
  button. With `showActions: false` the menu still renders, holding only those tabs.
- An overflow tab that is opened joins the strip just before the last tab, and leaves the menu while it is open.
- CnTabs gains `overflowInNavEnd`; CnActionsMenu gains a `lead-items` slot above Refresh.

Outside the board look nothing changes.
