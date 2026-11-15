# choice-matrix-pick-per-row Delta: choice-matrix-pick-per-row

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [choice-matrix-pick-per-row](../../)

## Purpose

A user picks one level per row and sees what the picks add up to.

## ADDED Requirements

### Requirement: A row holds one pick

With `pickPerRow` `CnChoiceMatrix` SHALL draw each row as a radio group of native radio buttons with a legend, from the row's `options` or else from `columns`. Each option SHALL show its label, `description` and `points`. A pick SHALL emit `update:modelValue` with `{ [rowId]: optionKey }`, leaving the other rows as they were, and `cell-change`. A read-only row SHALL have disabled radio buttons.

#### Scenario: Levels that differ per row

- **GIVEN** a row with three options and a row with two
- **THEN** each group offers its own, and a pick in one leaves the other alone

### Requirement: The picks add up to a score

`scoreLabel` SHALL show the sum of the picked points against `scoreMax`, or else against the sum of each row's highest points. `scoreMode` `weighted` SHALL multiply by each row's `weight` first. `score-change` SHALL report `{ score, max, complete }` on mount and on every change, where `complete` says every row that is not read only has a pick.

#### Scenario: Board LqInleveringNakijken "Score: 8 van 10"

- **GIVEN** `scoreLabel` "Score: {score} van {max}" and picks worth 8 of 10 points
- **THEN** the line reads "Score: 8 van 10"

#### Scenario: The weight is shown, not counted

- **GIVEN** rows with a weight and no `scoreMode`
- **THEN** the score adds the points as they are

### Requirement: A row can hold an error

`rowErrors` SHALL show its text with that row. With `pickPerRow` the group SHALL carry `aria-invalid` and name the text with `aria-describedby`.

#### Scenario: A row without a pick

- **GIVEN** `rowErrors` with text for one row
- **THEN** that row shows the text, and other rows are not invalid
