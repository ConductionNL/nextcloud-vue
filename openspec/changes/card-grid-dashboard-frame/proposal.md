# Proposal: card-grid-dashboard-frame

## Why

A `card-grid` widget placed on a dashboard drew two cards: the dashboard cell's titled card, and inside it the grid's
own CnWidgetWrapper with a second frame, an "Items" title and a second Actions menu. The boards draw one card with the
object cards inside it, spaced as a record list is spaced.

## What changes

- CnWidgetCardGrid takes a `chromeless` prop: no frame, title or Actions menu of its own.
- CnDashboardPage passes `chromeless` to the built-in `card-grid` widget in a cell, and to no other widget.
- The cards keep an inset from the cell's edge (24px at the sides in the board look), and stand flush in a borderless
  cell.

On its own, outside a dashboard cell, a card grid keeps its frame and title as before.
