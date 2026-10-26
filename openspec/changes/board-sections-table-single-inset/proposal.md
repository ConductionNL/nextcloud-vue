# Proposal: board-sections-table-single-inset

## Why

DqTermijnen's Kwartaalrapport and Jaarlijkse dwangsomaudit are sections cards: a form, then a table. The board draws
the table 1074px wide, the card's width less its 23px inset. Live drew it 1024px: the sections body already takes the
card's inset, and the widget table inside it added the dashboard table inset (22px a side) again.

## What changes

In the board look, a widget table inside a sections widget on a dashboard card takes no side or bottom inset of its
own; the sections body's inset is the only one.

## Scope

src/css/look-board.css. No schema change.
