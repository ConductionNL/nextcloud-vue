# chart-matrix-label-width Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [chart-matrix-label-width](../../)

## Purpose

A matrix keeps its columns where the board draws them, whatever its labels.

## ADDED Requirements

### Requirement: A matrix can give its row labels a fixed width

With `matrixLabelWidth` a positive number, a `matrix` chart SHALL draw its row-label column that many px wide. Without
it, or with a value that is not a positive number, the column SHALL size to its longest label, at least 120px.

#### Scenario: Dagen per fase

- **GIVEN** the matrix with `matrixLabelWidth: 240`
- **THEN** the case-type column is 240px and the five phases share the rest
