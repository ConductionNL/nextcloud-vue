# Proposal: board-dashboard-switch-row

## Why

The switch row under a board dashboard's header (DqMijnWerk, DqMijnTeam) did not draw the board's look:

- The link pills ("Uw wachtrij", "Aan mij toegewezen", "Dag afsluiten") were in the brighter primary text; the
  boards draw them in the deep primary ink of their primary pills (COMPDIFF r19: color rgb(35, 74, 120) > rgb(54,
  105, 165) on 6 pills, 2 boards). Under the Zuiddrecht set the theme's forced link ink set the colour, not the pill.
- The view switch's chosen segment drew the dark control edge, the labels were 15px and every label was in the main
  ink; the boards draw a raised white segment without an edge, 14px labels and the others in the soft ink (toolbar
  controlBorder 0 > 1).

## What changes

In the board look the link pills take the light primary text mixed 60/40 toward the main text, also as the theme's
on-surface ink, and the page view switch in the switch row has 14px labels in the soft ink, the chosen one in the main
ink without an edge (kept in forced-colours mode) and a 10px track corner.
