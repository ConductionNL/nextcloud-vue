# dashboard-grid Delta: dashboard-layout-swap-keeps-order

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [dashboard-layout-swap-keeps-order](../../)

## Purpose

The cards a layout change brings into a built grid land where the layout puts them.

## ADDED Requirements

### Requirement: Cards a layout change adds keep their authored order

When the layout of a built grid changes and brings in cards the grid does not hold yet (a `layoutWhen` swap, a view switch), the grid SHALL add those cards top to bottom and then left to right, and SHALL size a size-to-content card among them only after every new card is placed. The sizing SHALL run in the same order and through the path that moves the cards under a growing cell down first. A card the grid already holds SHALL be moved to its new place as before.

#### Scenario: PqWerkplekKlant, the call starts

- **GIVEN** the werkplek dashboard, and an in-call layout with a full-width size-to-content tile row on row 0 and three columns of cards from row 2
- **WHEN** a call starts and the page swaps to the in-call layout
- **THEN** every new card is added before any of them is sized
- **AND** the tile row is added first and sized first, so it stays above the three columns
