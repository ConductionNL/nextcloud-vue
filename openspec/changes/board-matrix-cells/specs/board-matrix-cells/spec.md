# board-matrix-cells Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-matrix-cells](../../)

## Purpose

A matrix chart in the board look has the type and the ink the boards draw.

## ADDED Requirements

### Requirement: A board matrix takes the board's type

In the board look a matrix chart SHALL be set at 14px at the font's normal line height, its column heads and cell
figures at weight 600 (a highlighted cell keeps its own weight). The column heads, a level 1 and a level 4 cell SHALL
set `--nldesign-color-on-surface` to their own ink; a level 3 cell SHALL NOT hand over an ink below 4.5:1 on its tint.

#### Scenario: DqProcesanalyse "Dagen per fase"

- **GIVEN** the process analysis dashboard in the board look
- **THEN** a "2 d" cell is 37px high, its figure 14px at 600

#### Scenario: Under thematiq

- **GIVEN** the matrix under a theme that colours every span from `--nldesign-color-on-surface`
- **THEN** a level 1 cell keeps the light primary ink and a level 4 cell its white
