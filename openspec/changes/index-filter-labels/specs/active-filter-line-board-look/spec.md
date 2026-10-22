# active-filter-line-board-look Delta: index-filter-labels

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-filter-labels](../../)

## Purpose

The Active line names a filter the way a person reads it, also when the filter
came from the address.

## ADDED Requirements

### Requirement: A page names its filters

An index page MAY declare `filterLabels`, an object keyed by filter key whose
entries hold an optional `label` (the field) and an optional `values` object
(value to text). The Active line SHALL name the field by that `label` and a
value by its `values` entry, both run through the app's translate, before any
other source. Without an entry the field SHALL be named by the schema
property's title, else, on a named source, by the title of the `sidebar.fields`
entry, else by the key; a value without an entry SHALL be named as the
requirement "An active chip names the value, not its id" says, with a named
source's `enumLabels` before the raw value.

#### Scenario: Open cases from a link

- **GIVEN** `filterLabels: { isFinalStatus: { label: "Status", values: { "false": "Ongoing" } } }` and the address `?isFinalStatus=false`, in Dutch with "Ongoing" translated to "lopend"
- **WHEN** the cases list renders under the board look
- **THEN** the Active line reads "Status: lopend"

#### Scenario: A named source without filterLabels

- **GIVEN** a task list whose `sidebar.fields.priority` has title "Priority" and `enumLabels: { high: "High" }`, filtered on `priority=high`
- **WHEN** the list renders
- **THEN** the chip reads "Priority: High", not "priority: high"

### Requirement: A range is one chip

A range filter SHALL show as one chip: a value with `from` and/or `to`, and the
keys `<key>[gte]`/`<key>[gt]` and `<key>[lte]`/`<key>[lt]` taken together
under `<key>`. The chip SHALL read "{from} through {to}", "from {from}" or "up to
{to}" through the library's translate. A date end SHALL be written in the
person's locale with day and month, the month only once when both ends share
month and year, and the year only when an end is not in the current year.
Removing the chip SHALL clear every key it stands for.

#### Scenario: Tasks due this month

- **GIVEN** `filterLabels: { dueAt: { label: "Deadline" } }` and `?dueAt=2026-10-01..2026-10-31` on 22 October 2026, in Dutch
- **WHEN** the task list renders
- **THEN** the Active line reads "Deadline: 1 tot en met 31 oktober"

#### Scenario: A header range filter

- **GIVEN** active filters `deadline[gte]: 2026-10-01` and `deadline[lte]: 2026-11-15` on a schema whose `deadline` is titled "Deadline", in English
- **WHEN** the list renders
- **THEN** there is one chip, "Deadline: October 1 through November 15", and removing it clears both keys
