# index-list-board-look Delta: screens-table-footer-and-system-dates-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-table-footer-and-system-dates-parity](../../)

## Purpose

The table count in the user's language and the object's system dates as
columns, as the PqTickets and PqKassabonnen boards draw them.

## ADDED Requirements

### Requirement: The count reads in the user's language

The table footer's count (`{shown} of {total}`), the compact pagination info
(`{from}–{to} of {total}`) and the board count line's default SHALL be the
library's translated strings; the Dutch catalogue SHALL read
`{shown} van {total}` and `{from}–{to} van {total}`. A page's own `countText`
SHALL go through the app's label lookup as before.

#### Scenario: A Dutch ticket list

- **GIVEN** a ticket index page under the board look for a Dutch user, 14 tickets, no `countText`
- **WHEN** it renders
- **THEN** the count line and the footer read "14 van 14"

@e2e include Read the footer count on pipelinq/PqTickets with the user language nl.

### Requirement: A system date can be a column

A table column SHALL accept `@self.created`, `@self.updated`,
`@self.published` or `@self.depublished` as its `key`. The cell SHALL show
the value from the row's `@self` block rendered as a date-time, unless the
column declares its own `type` or `format`. Other keys without a schema
property SHALL render as before.

#### Scenario: The receipts list

- **GIVEN** a receipts index page with the column `{ "key": "@self.created", "label": "Aangemaakt" }`
- **WHEN** it renders
- **THEN** the column "Aangemaakt" shows each receipt's creation date as a date

@e2e include Read the Aangemaakt column against pipelinq/PqKassabonnen.
