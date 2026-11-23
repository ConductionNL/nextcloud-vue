# action-auth-matrix Delta: action-auth-matrix

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [action-auth-matrix](../../)

## Purpose

One rights matrix for every app that follows ADR-023, so an app configures an
endpoint instead of shipping its own table.

## ADDED Requirements

### Requirement: An administrator edits which groups may perform each action

`CnActionAuthMatrix` SHALL read `GET endpoint` for `{ actions, groups, matrix }`
and draw a table with one row per action and one column per group, with the
`fixedGroups` columns (default `admin`) first, then `extraGroups`, then the
other groups. A fixed column SHALL be ticked and locked. Each checkbox SHALL be
named with its group and action. Saving SHALL send the whole matrix as
`PUT endpoint` `{ matrix }` through `@nextcloud/axios`, with the fixed groups
in every list. A refused save, or an answer without a `matrix`, SHALL keep the
ticks on screen and show why in an alert; success SHALL be shown only when the
answer carries the stored matrix.

#### Scenario: A refused save keeps the admin's ticks

- **GIVEN** the admin ticked a group for an action
- **WHEN** the server refuses the save
- **THEN** the tick stays on screen and an alert says why
- **AND** no success is shown and `saved` is not emitted
