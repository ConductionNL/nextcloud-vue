# status-list Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [status-list](../../)

## Purpose

A short list of items with a status pill, a due date and counts per status.

## ADDED Requirements

### Requirement: A status list draws items with a status and a due date

`CnStatusList` SHALL draw each item with a title as a row: the title as a link when it has an `href`, a detail line,
the due date and a status pill. An `external` link SHALL open in a new tab with `noopener`. A due date before today
on an item that is not `done` SHALL read as overdue.

#### Scenario: Overdue case

- **GIVEN** a case due on 20 November and today 22 November
- **THEN** its row says "Overdue since 20 Nov" in the error colour

### Requirement: A status list can show counts per status

With `counts`, the list SHALL draw one pill with its number per status above the items.

#### Scenario: Counts

- **GIVEN** counts "Open 4" and "In behandeling 2"
- **THEN** both pills show above the items with their numbers

### Requirement: A status list says when it is empty or failed

Without items the list SHALL show its `emptyLabel`. With an `error` it SHALL show the error instead of the items.

#### Scenario: Empty

- **GIVEN** no items and the empty label "No cases assigned to you"
- **THEN** the list says "No cases assigned to you"
