# stats-box-card-inset Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [stats-box-card-inset](../../)

## Purpose

A card of boxed stat tiles is spaced as the board draws it.

## ADDED Requirements

### Requirement: A card of boxed stat tiles keeps the board's inset

In the board look, a dashboard card whose stats block draws boxed tiles SHALL place its tiles 22px from the card's
sides and SHALL draw no rule under its header. A stats card without boxed tiles SHALL keep its inset; it draws no divider either (see
board-dashboard-card-header).

#### Scenario: Vergaderingen en efficiëntie

- **GIVEN** a reports page card "Vergaderingen en efficiëntie" with `tiles: "box"`
- **THEN** its first tile starts 22px from the card's left edge
- **AND** its header has no bottom rule
