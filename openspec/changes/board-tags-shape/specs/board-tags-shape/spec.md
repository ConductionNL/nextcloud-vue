# board-tags-shape Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-tags-shape](../../)

## Purpose

Status tags take the boards' one tag shape.

## ADDED Requirements

### Requirement: A board tag is a 21px rounded rectangle

In the board look every CnStatusBadge, small or medium, in a table cell or not, SHALL draw 13px at weight 600 on a
3px 10px pad with a 12px corner and a normal line height.

#### Scenario: dossiq's tasks list

- **GIVEN** the tasks index in the board look
- **THEN** each status tag is 21px tall with a 12px corner
