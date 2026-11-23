# data-widget Delta: screens-data-mini-table-fits

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-data-mini-table-fits](../../)

## Purpose

A data card's list-of-objects table fits its value cell.

## ADDED Requirements

### Requirement: A list-of-objects table fits its value cell

The data widget's table for a list of objects SHALL wrap its cells and SHALL NOT be wider than its value cell, also
when an ancestor sets `white-space: nowrap`.

#### Scenario: Messages with a timestamp

- **GIVEN** a ticket whose messages have a long text and a `createdAt` timestamp, in a narrow value cell under a `nowrap` ancestor
- **WHEN** the card renders
- **THEN** the table ends inside its value cell and the card does not overflow
