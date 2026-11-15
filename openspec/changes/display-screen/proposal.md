# Proposal: display-screen

## Why

Board LqInfoscherm draws a hall screen without sign-in: a dark full page with a title, a clock, the rows of the day and a line at the bottom. Board LqLes
puts the self check-in code on a classroom board, the whole page without a menu. learniq `DisplayScreenView` carries the first as local code.

## What changes

- New `CnDisplayScreen`: `title`, `subtitle`, `clock`, `updatedAt`, `stale`, `footer`, `dark`, `overlay`, and slots for the rows, the bottom line and buttons.
- The host owns the rows and the refresh. What a screen may show stays with the host.

Item 6 of the fleet component gap list (decisions 281, 320).
