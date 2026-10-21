# board-matrix-tones Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-matrix-tones](../../)

## Purpose

A matrix chart draws the boards' four tones, each with an ink that reaches 4.5:1.

## ADDED Requirements

### Requirement: A matrix draws the board's four tones

A `matrix` chart SHALL draw level 1 on the light primary, level 2 on the primary at 35% and level 3 on the primary at
70% over the main background, both in the main ink, and level 4 on the light primary text in the light primary. Every
level's ink SHALL reach 4.5:1 on its ground in Nextcloud's default light and dark themes.

#### Scenario: DqProcesanalyse days per phase

- **GIVEN** the Zuiddrecht set and a matrix whose largest value is 18
- **THEN** a 9 cell is drawn on about #b9cde3, a 14 cell on about #6f95c4 in the dark ink and the 18 cell on #234a78
