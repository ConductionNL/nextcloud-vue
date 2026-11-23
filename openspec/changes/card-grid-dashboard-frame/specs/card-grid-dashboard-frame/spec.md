# card-grid-dashboard-frame Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [card-grid-dashboard-frame](../../)

## Purpose

A card grid on a dashboard is one card with the object cards inside it, not a card inside a card.

## ADDED Requirements

### Requirement: A card grid on a dashboard draws no frame of its own

A `card-grid` widget rendered in a CnDashboardPage cell SHALL draw no frame, title or Actions menu of its own; the cell
draws the titled card. Its object cards SHALL keep an inset from the cell's edge, and stand flush in a borderless cell.
A CnWidgetCardGrid outside a dashboard cell SHALL keep its own frame and title.

#### Scenario: A card grid in a dashboard cell

- **GIVEN** a dashboard with a `card-grid` widget titled "Rekeningen"
- **THEN** the page shows one card titled "Rekeningen"
- **AND** no second frame or "Items" title inside it

#### Scenario: A card grid on its own

- **GIVEN** a CnWidgetCardGrid outside a dashboard
- **THEN** it draws its own frame and title, as before
