# map-list-formatters Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [map-list-formatters](../../)

## Purpose

The numbered list beside an index map shows display names, not stored references, and keeps its card for the rows
without a place in view.

## ADDED Requirements

### Requirement: A map list reads display names through the app's formatters

A `mapConfig.list` pill with `formatter` SHALL take its label from the app formatter of that name (`cnFormatters`),
given the raw value and the row. A template token `{path|name}` whose format is not a built-in one SHALL be filled by
the app formatter of that name. `sub` MAY be a list of templates, and the first that fills SHALL be shown.

#### Scenario: DqZakenKaart "Verlichting fietspad Lindelaan"

- **GIVEN** a located case of type "Woo-verzoek", status "In behandeling", with a case location at "Lindelaan 40"
- **AND** the list declares `sub: ["{id|caseAddress} · {identifier}", "{identifier}"]` and pills for the case type
  (`formatter: caseTypeName`) and `statusPublicLabel`
- **THEN** the row reads "Lindelaan 40 · 2026-0082" with the pills "Woo-verzoek" and "In behandeling"
- **AND** a located case without a case location reads its case number only

### Requirement: A map list pill takes its tone and icon from the referenced record

A `mapConfig.list` pill with `resolve: { colorField?, iconField?, register?, schema? }` SHALL take its tone and icon
from the record its `path` value points at, read by the index page with the same resolver as its other pills
(pill-color-field), the colour mapped onto a badge tone. Until the look arrives, the declared tone is shown.

#### Scenario: DqZakenKaart status pill

- **GIVEN** a map list pill `{ path: "status", formatter: "statusTypeName", resolve: { colorField: "colour" } }`
- **AND** a case whose status type "In behandeling" has `colour: purple`
- **THEN** the row's status pill reads "In behandeling" in the purple tone

### Requirement: The card for rows without a place stays under the list

The map list SHALL scroll inside the side column, and its rows and the card for the rows without a place SHALL keep
their height, so the card stays directly under the list.

#### Scenario: a page with eleven located cases

- **GIVEN** the map view with eleven located cases and nine without a place
- **THEN** the "9 without an address" card is visible under the list, and the list scrolls
