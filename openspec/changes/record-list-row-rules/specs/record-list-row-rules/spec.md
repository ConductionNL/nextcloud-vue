# record-list-row-rules Delta: record-list-row-rules

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-row-rules](../../)

## Purpose

A record list's row actions can differ per row, and one can link to an address the row holds.

## ADDED Requirements

### Requirement: A row action can depend on the row

A `rowActions` entry with `visibleWhen` SHALL show only on rows for which that condition, read against the row,
holds. A row with no action left SHALL have no actions menu. An entry with `href` SHALL be drawn as a link whose
address is `href` filled from the row. An address starting with `http://` or `https://` SHALL open in a new tab, an
address starting with a single `/` SHALL open in place, and any other address SHALL hide the action on that row.

#### Scenario: An invitation filled in-app or on an external form

- **GIVEN** a "Fill in" action with `visibleWhen` `instrumentKind` is `internal`, and an "Open the form" action with
  `href: "{externalUrl}"` and `visibleWhen` `instrumentKind` is `external`
- **THEN** an internal invitation offers "Fill in", which opens the dialog with that row
- **AND** an external invitation offers "Open the form", a link to its address in a new tab
- **AND** an external invitation whose address is `javascript:` has no actions menu
