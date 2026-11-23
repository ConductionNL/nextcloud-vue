# board-matrix-plain-cells Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-matrix-plain-cells](../../)

## Purpose

A matrix cell without a figure stands back from the cells that carry one.

## ADDED Requirements

### Requirement: A board matrix cell without a tone sits on the ground in the muted ink

In the board look, a CnChartWidget matrix cell at level `tone` without an inline colour, or at level 0, SHALL take the
content surface (`--nldesign-component-content-surface-background-color`, else `--color-background-hover`) as its
background and `--color-text-maxcontrast` as its ink. Cells with a level or a colour, and the Nextcloud look, SHALL be
unchanged.

#### Scenario: A phase a case type does not have

- GIVEN DqProcesanalyse in the board look with "Dagen per fase" where a case type has no days in a phase
- WHEN the matrix renders the "geen" cell
- THEN the cell is on the page ground in the muted ink, as the board draws it
