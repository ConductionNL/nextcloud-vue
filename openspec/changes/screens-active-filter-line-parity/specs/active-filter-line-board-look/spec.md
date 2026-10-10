# active-filter-line-board-look Delta: screens-active-filter-line-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-active-filter-line-parity](../../)

## Purpose

The Active line and the Filter badge of the board toolbar, as PqLeads,
PqTickets and DqZaken draw them.

## ADDED Requirements

### Requirement: A quick filter with an active label joins the Active line

Under the board look, a selected quick filter whose entry declares
`activeLabel` SHALL add a chip to the Active line with that text run through
the app's translate, before the facet chips, and SHALL count on the Filter
badge. A selected tab without `activeLabel` SHALL add no chip. Removing the
chip SHALL, with one tab selectable, select the default tab (`default: true`,
else the first) unless that tab is the removed one or declares an
`activeLabel` itself, in which case no tab SHALL be selected; with several
tabs selectable it SHALL drop the tab from the selection. Clear all SHALL do
the same for every quick-filter chip. Without the board look nothing SHALL
change.

#### Scenario: PqLeads

- **GIVEN** quick filters "Open" (default, `activeLabel: "Pipeline: Sales"`) and "Won", with "Open" selected, in Dutch
- **WHEN** the list renders under the board look
- **THEN** the Active line reads "Actief: Pijplijn: Verkoop ×, Alles wissen" and the Filter badge reads 1

#### Scenario: Removing it

- **GIVEN** that chip
- **WHEN** the person removes it
- **THEN** no tab is selected, the list refetches without the tab filter and the badge disappears

#### Scenario: An All tab

- **GIVEN** dossiq's "All" tab with a non-empty filter and no `activeLabel`, selected
- **WHEN** the list renders
- **THEN** the Active line shows no chip for it

### Requirement: An active chip names the value, not its id

The Active line SHALL name each value of an active filter by, in order: the
label of the referenced object when the property is a reference (resolved in
the same batch as reference columns, with `title`, `name` or `@self.name`
when no column names a label field), the facet bucket's `label`, the schema
property's `oneOf` entry `title` (translated), else the value as written.

#### Scenario: A case type from a menu preset

- **GIVEN** `?caseType=3c0f5a00-...` on a list whose `caseType` property references the case type schema
- **WHEN** the label has resolved
- **THEN** the chip reads "Zaaktype: Woo-verzoek", not the id

### Requirement: The filter vocabulary names the end of the month

The filter token vocabulary SHALL include `@monthEnd`, the last day of the
current month, and `@nextMonthStart`, the first day of the next month, both
as `YYYY-MM-DD` in local time, in every place the filter tokens resolve and
in the manifest schema's filter token pattern.

#### Scenario: Closes this month

- **GIVEN** `filter: { expectedCloseDate: { gte: "@monthStart", lte: "@monthEnd" } }` on 9 October 2026
- **WHEN** the list fetches
- **THEN** it asks for dates from 2026-10-01 up to and including 2026-10-31
