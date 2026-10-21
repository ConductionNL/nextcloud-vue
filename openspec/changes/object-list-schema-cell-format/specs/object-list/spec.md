# object-list Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [object-list-schema-cell-format](../../)

## Purpose

An object list draws a named column the way the schema describes it.

## ADDED Requirements

### Requirement: A named column keeps the schema's format and enum labels

A CnObjectListWidget column on a top-level key that does not state its own `format`, `enum`, `widget` or `formatter`
SHALL take the schema property's `format` and its `enum` with `enumLabels` or `x-enum-labels`, also when the column
states its own `label`.

#### Scenario: Contact moments

- **GIVEN** columns `{ key: "channel", label: "Kanaal" }` and `{ key: "receivedAt", label: "Ontvangen" }`
- **AND** a schema where `channel` is an enum with `x-enum-labels` and `receivedAt` is `format: date-time`
- **THEN** the channel cell shows the label and the received cell shows a date

#### Scenario: The column says its own

- **GIVEN** a column with its own `format`, `enum` or `widget`
- **THEN** that column keeps it
