# board-split-list-gives-way Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-split-list-gives-way](../../)

## Purpose

A record opened beside a list is readable in the board look, whatever the list's table width.

## ADDED Requirements

### Requirement: The split pane keeps its width beside a board table

CnIndexPage's split pane SHALL keep its declared width beside the list. In the board look the list card SHALL take
the width the pane leaves. The full-width detail layout SHALL NOT change.

#### Scenario: Board PqKassaAudit

- GIVEN the Pipelinq cash register audit log in the board look at 1440px
- WHEN the user opens an audit row
- THEN the pane beside the list is 42% of the body wide (470px) and shows the audit record
- AND the list card takes the remaining width with its table fitted to it
