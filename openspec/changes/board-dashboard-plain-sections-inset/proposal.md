# Proposal: board-dashboard-plain-sections-inset

## Why

COMPDIFF r22 measured DqTermijnen's "Jaarlijkse dwangsomaudit" card with its first line 1px from the card's edge,
where the board starts it at 23. A dashboard card holding a sections widget is flush, because a sections widget
usually draws its own cards. The plain sections widget draws none, so its text sat against the edge.

## What changes

In the board look a dashboard card whose body is a plain sections widget takes the dashboard card's side inset and
20px below, the same inset a card-of-cards sections grid already has. The Nextcloud look is unchanged.
