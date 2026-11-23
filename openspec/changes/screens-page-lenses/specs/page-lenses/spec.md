# page-lenses Delta: screens-page-lenses

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-page-lenses](../../)

## Purpose

Let a dashboard page offer chips (with counts) that show one kind of work at a time, declared in the manifest.

## ADDED Requirements

### Requirement: A workspace filter can draw chips with counts

With `content.style: "chips"` the `workspace-filter` widget SHALL draw its options as one compact radio group. An
option SHALL show a count when it has a numeric `count`, or a `countFrom` (`{ register, schema, filter? }`, or a list of
them whose totals are added up) whose total is known. An option whose count failed SHALL show no count.

#### Scenario: Counts from queries

- **GIVEN** an option "Alle" with `countFrom` over tickets and leads
- **WHEN** the tickets total is 7 and the leads total is 2
- **THEN** the chip reads "Alle 9"

#### Scenario: A failed count

- **WHEN** one of the lists cannot be counted
- **THEN** the chip shows its label only

#### Scenario: Keyboard

- **WHEN** focus is in the group and the user presses the right arrow
- **THEN** the next chip is chosen and its value is written to the `writes` key

### Requirement: The choice is in the address

With `content.urlKey` the chosen value SHALL be written to the address as `?<urlKey>=<value>`, replacing the history
entry and keeping the other query keys. On load a value in the address that names an option SHALL win over `default`.

#### Scenario: A linked chip

- **GIVEN** `urlKey: "lens"` and an address `?lens=leads`
- **WHEN** the page loads
- **THEN** the "Leads" chip is chosen and `lens` in the workspace is `leads`

### Requirement: A widget can be shown by a workspace value

A `visibleWhen` condition `{ workspace, op?, value? }` SHALL compare the page workspace value at that key, without a
request. The operator `in` SHALL hold when the value is one of the listed values. A dashboard widget whose condition
does not hold SHALL surrender its grid cell and the rows below SHALL close up; a KPI-row tile SHALL not draw. Edit mode
SHALL show every widget.

#### Scenario: Switching the chip

- **GIVEN** widgets shown for `in ["all", "tickets"]` and for `in ["all", "leads"]`
- **WHEN** the key changes from `tickets` to `leads`
- **THEN** the first widget is gone, the second is drawn, and there is no empty cell
