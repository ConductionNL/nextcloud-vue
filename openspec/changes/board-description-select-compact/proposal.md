# Proposal: board-description-select-compact

## Why

DqProcesanalyse's description line holds the period text, the Gemiddeld/Mediaan group and two selects, "Laatste 12
maanden" and "Alle zaaktypen", on one line. NcSelect's own `min-width: 260px` outranked the description select's 180px,
so each select was 256px wide and the case type select wrapped onto a line of its own.

## What changes

In the board look a select on a dashboard description line takes the width of its choice (no 260px minimum).

## Scope

src/css/look-board.css. No schema change.
