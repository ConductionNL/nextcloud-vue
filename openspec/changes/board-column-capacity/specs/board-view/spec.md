# board-view Delta: board-column-capacity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-column-capacity](../../)

## Purpose

A board column can carry a limit, as dossiq's statuses do. A column without one stays as it is.

## ADDED Requirements

### Requirement: A column can carry a capacity

With `source.capacityField` on a `columnFields` entry, a column made from one referenced row SHALL take that row's
number above 0 as its limit. A column merged from two or more rows SHALL show no limit. A lifecycle state's
`capacity` SHALL be its column's limit. A column with a limit SHALL read "count / capacity" in its header, counted
over every lane, and SHALL be drawn full (error colour and the word "full" for a screen reader) when the count is at
or past the limit. A column without a limit SHALL read its count as before.

#### Scenario: Hoorzitting holds one of one

- **GIVEN** the bezwaar status Hoorzitting has capacity 1 and one case
- **THEN** its header reads "1 / 1" in the full style, and Besluit with capacity 2 and no case reads "0 / 2"

#### Scenario: A merged column

- **GIVEN** "In behandeling" is merged from a Woo row (capacity 1) and a bezwaar row (capacity 5)
- **THEN** its header reads the count only, and once the board is narrowed to Woo it reads "1 / 1"

### Requirement: A drop into a full column is refused

A move into a full column SHALL be refused with "{column} is full: {count} of {capacity}." without asking the host,
for a drag, the card menu and the Move to select. During a drag a full column SHALL fade; in the card menu it SHALL
read "full" and be disabled. A move into a referenced row whose cards already reach its limit SHALL be refused with
the same sentence before the move handler or the PATCH runs, also in a merged column.

#### Scenario: A bezwaar case to a full Hoorzitting

- **WHEN** a bezwaar case is dropped on Hoorzitting, which holds one of one
- **THEN** the board says "Hoorzitting is full: 1 of 1." and nothing is written

#### Scenario: The full row of a merged column

- **WHEN** a Woo case is dropped on the merged "In behandeling" whose Woo row holds one of one
- **THEN** the board says "In behandeling is full: 1 of 1." and nothing is written, and a bezwaar case dropped there is written
