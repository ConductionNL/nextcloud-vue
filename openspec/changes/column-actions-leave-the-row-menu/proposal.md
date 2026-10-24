# Proposal: column-actions-leave-the-row-menu

## Why

DqPostvak on :8080 (24 Oct, r25b): each message showed "Aan zaak koppelen" and "Nieuwe zaak" as buttons in the Doen
column and again in a "..." row menu at the end of the row. The extra menu column squeezed the Doen column, so the two
buttons stacked and every row grew from 66 to 87px. The board draws the buttons once, side by side, and no row menu.

## What changes

The row menu (and the right-click menu) leaves out the actions an `actions` column already shows. A row whose menu
would be empty draws no menu column. Actions the column does not show stay in the menu.
