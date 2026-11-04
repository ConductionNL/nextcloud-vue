# choice-matrix Delta: choice-matrix

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [choice-matrix](../../)

## Purpose

A host sets one choice per row and column out of a closed set, such as what each role may do with each field.

## ADDED Requirements

### Requirement: Every cell holds one choice from a closed set

`CnChoiceMatrix` SHALL draw `rows` against `columns` as a table with row and column headers, each editable cell offering
`choices`, with a control named by both its row and its column. A cell with nothing stored SHALL show `defaultValue`. A
pick SHALL emit `update:modelValue` with the whole new map and `cell-change` with
`{ rowId, columnKey, value, previous }`, and the emitted map SHALL keep every other cell. Picking the value a cell
already holds, or nothing, SHALL emit nothing. A row or column with `readOnly`, or the `readOnly` prop, SHALL draw its
cells as text, and a stored value outside `choices` SHALL read as stored. With no rows or no columns the component SHALL
show `emptyLabel`, else the library's default text, and no table.

#### Scenario: Board DqZaaktypeVelden "Wie wat ziet en invult"

- **GIVEN** a row "Bouwkosten", a column "Intaker, ontvangen" and choices Verborgen, Verplicht and Alleen lezen
- **WHEN** the user picks Verplicht in that cell
- **THEN** `update:modelValue` holds the new choice under that row and column, with every other cell as it was
- **AND** `cell-change` names the row, the column, the new value and the previous one

#### Scenario: A read-only column

- **GIVEN** a column with `readOnly`
- **THEN** its cells read as text and offer no control

#### Scenario: A stored value outside the set

- **GIVEN** a read-only cell whose stored value is not in `choices`
- **THEN** the cell reads that value as stored
