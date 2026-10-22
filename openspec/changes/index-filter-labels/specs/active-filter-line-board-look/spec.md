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

### Requirement: Several values read as a list

When an active filter holds several values, its chip SHALL join their names
as a conjunction list in the person's locale (`Intl.ListFormat`, type
`conjunction`): "actief en verlopend" in Dutch, "active and ending" in
English, "a, b en c" for three. Where the environment has no
`Intl.ListFormat`, the names SHALL be joined with ", ".

#### Scenario: DqContracten

- **GIVEN** `?status[]=active&status[]=ending` and `filterLabels: { status: { values: { active: "active", ending: "ending" } } }`, in Dutch with those translated to "actief" and "verlopend"
- **WHEN** the contracts list renders
- **THEN** the chip reads "Status: actief en verlopend"

### Requirement: A range from today is named in words

A `filterLabels` entry MAY set `relative: true`. Its range chip SHALL then,
judged against today in the person's time zone (an `@today` token counts as
the date it resolves to), read "today" for a range from today to today or to
tomorrow, "within {n} days" for a range from today to n days on, and "this
week" for Monday to Sunday (or to next Monday) of the current week, through
the library's translate; any other range SHALL read as dates. Without
`relative` the chip SHALL read as dates.

#### Scenario: DqFilterInMenu

- **GIVEN** the saved view "Termijn deze week" with `deadline[gte]: @today` and `deadline[lt]: @today+7d`, and `filterLabels: { deadline: { label: "Due by", relative: true } }`, in Dutch
- **WHEN** the view is applied
- **THEN** the chip reads "Deadline: binnen 7 dagen"

