# record-list-row-bar Delta: record-list-row-bar

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-row-bar](../../)

## Purpose

A record list row can carry a thin track that shows how full it is, as the "Team vandaag" panels draw it.

## ADDED Requirements

### Requirement: A record list row can carry a bar

CnRecordListWidget SHALL take `content.bar` `{ valueField, maxField?, overVariant? }`. In the `rows` presentation each
row with a numeric `valueField` SHALL draw a track under it, exposed as a meter. Without `maxField` the track SHALL be
filled to the value's share of the largest value over the rows shown. With `maxField` it SHALL be filled to the value
against that row's maximum, capped at full, and with `overVariant: "error"` it SHALL take the error colour when the value
is past the maximum. Without `bar` no track SHALL render.

#### Scenario: Board DqTeamwachtrij

- **GIVEN** `bar: { valueField: "open" }` and colleagues with 6, 11 and 0 open cases
- **THEN** the tracks are filled 55%, 100% and 0%

#### Scenario: Board PqWachtrij

- **GIVEN** `bar: { valueField: "open", maxField: "maxConcurrent", overVariant: "error" }`
- **AND** an agent with 11 open tickets and `maxConcurrent` 10
- **THEN** that agent's track is full and drawn in the error colour
