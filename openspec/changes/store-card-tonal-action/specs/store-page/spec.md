# store-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [store-card-tonal-action](../../)

## ADDED Requirements

### Requirement: Install and Update are the tonal card pill

In the board look a store card's Install or Update action SHALL draw in the light primary tint with the light primary
ink, as the tonal pill, and the chosen lens chip SHALL draw without an edge. Open keeps the outlined button.

#### Scenario: PqStore

- **GIVEN** the store page in the board look with an available item
- **THEN** its "Installeren" pill draws on the light primary tint (#eaf0f7 on Zuiddrecht) in the deep primary ink
- **AND** the "Alle" lens chip, chosen, has no border
