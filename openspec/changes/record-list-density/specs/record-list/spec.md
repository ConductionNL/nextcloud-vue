# record-list Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-density](../../)

## Purpose

A record list can be as dense as the board draws it.

## ADDED Requirements

### Requirement: A record list can draw compact rows

With `content.density: "compact"` CnRecordListWidget SHALL draw each row with 10px above and below, at least 56px tall,
and the title at weight 500. Without it the rows SHALL keep their default spacing and weight.

#### Scenario: DqProcesanalyse

- **GIVEN** the "Waar zaken blijven hangen" card with `density: "compact"` on a board dashboard
- **THEN** "Bezwaar, fase Advies" draws at 500 in a 56px row
