---
kind: code
---

# Proposal: screens-index-stat-row

## Summary

Several index boards draw more than a list. DqTeamwachtrij puts three KPI
tiles above it ("Zonder behandelaar", "Wacht het langst", "Termijn binnen 7
dagen") and a 300px column beside it with a "Team vandaag" card and a small
"Werkvoorraad per zaaktype" table. PqContracten, PqNieuwsbrieven and
PqKassabonnen put KPI tiles above the list ("Terugkerende omzet per maand",
"Te verlengen binnen 90 dagen", ...). CnIndexPage has no manifest way to draw
either (round6 dossiq library gap 10, pipelinq "KPI cards above the list").

This change adds two page config keys to CnIndexPage:

1. `statRow`: dashboard widget definitions drawn as an auto-fit KPI row
   between the header and the toolbar (each tile at least 200px, gap 16, the
   same CnKpiGrid `columns: "auto"` the dashboard KPI row uses). With `type:
   "stat"` they are CnStatWidget tiles, which take the board tile
   (`screens-stat-tile-parity`) in the board look.
2. `sidePanel`: dashboard widget definitions drawn as titled cards in a 300px
   column right of the toolbar and the list, 20px from it, 16px between cards.

Both resolve their `type` like a dashboard widget: the app's registry first
(an app widget such as a "team today" card), then the dashboard catalog
(`stat`, `table`, `people`, `stats-block`, ...). The toolbar, chips and rows
are not touched (lanes G1 and G2 own them); the count chips on these boards
are the existing quick-filter chips.

## Reference screens

- `dossiq/DqTeamwachtrij`: https://identity.conduction.nl/screens/board?id=dossiq/DqTeamwachtrij
- `pipelinq/PqContracten`, `pipelinq/PqNieuwsbrieven`, `pipelinq/PqKassabonnen`

## Affected consumers

dossiq (Queue), pipelinq (Contracts, Newsletters, Receipts). Without the keys
the page renders as before.

## Backward compatibility

Additive. Manifest schema: the next free minor after
`screens-dashboard-greeting-header` (2.76.0).
