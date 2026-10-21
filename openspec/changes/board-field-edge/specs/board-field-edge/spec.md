# board-field-edge Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-field-edge](../../)

## Purpose

Board fields draw the edge the boards draw.

## ADDED Requirements

### Requirement: A board field draws a 1px edge all round

In the board look a text field, a textarea and a select's search box SHALL draw a 1px border in the control colour
(`--cn-board-control-border`) with the board radius and no shadow; focus SHALL keep its ring.

#### Scenario: DqProcesanalyse

- **GIVEN** the "Filteren op zaaktype" page filter in the board look
- **THEN** its edge is 1px #828a95 on all sides
